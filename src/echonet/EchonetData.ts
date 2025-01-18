import { Buffer } from "buffer";

export class EchonetData {
  private constructor(
    public readonly tid: number, // トランザクションID
    public readonly seoj: number, // 送信元オブジェクト
    public readonly deoj: number, // 宛先オブジェクト
    public readonly esv: number, // サービスコード
    public readonly properties: EchonetProperty[], // プロパティリスト
  ) {}

  static create({
    tid,
    seoj,
    deoj,
    esv,
    properties,
  }: {
    tid?: number;
    seoj: number;
    deoj: number;
    esv: number;
    properties: {
      epc: number;
      edt?: number | bigint;
    }[];
  }) {
    const randomTid = Math.floor(Math.random() * 0xffff); // 0x0000 〜 0xffff の範囲で生成
    return new EchonetData(
      tid ?? randomTid,
      seoj,
      deoj,
      esv,
      properties.map(({ epc, edt }) => {
        let edtBigInt;
        if (typeof edt === "number") {
          if (!Number.isInteger(edt) || edt < 0) {
            throw new TypeError(`EDT must be a positive integer, got: ${edt}`);
          }
          edtBigInt = BigInt(edt);
        } else if (typeof edt === "bigint") {
          if (edt < 0) {
            throw new RangeError(`EDT must be a positive value, got: ${edt}`);
          }
          edtBigInt = edt;
        } else {
          edtBigInt = 0n;
        }

        // 必要最小限の PDC を計算
        const calculatedPdc = Math.ceil(edtBigInt.toString(16).length / 2); // HEX表現の長さからバイト数を計算

        return {
          epc,
          pdc: calculatedPdc,
          edt: edtBigInt,
        };
      }),
    );
  }

  static parse(frame: Buffer): EchonetData {
    if (frame.readUInt16BE(0) !== 0x1081) {
      throw new Error("Invalid header");
    }
    if (frame.length < 12) {
      throw new Error("Invalid frame: Frame is too short.");
    }

    const tid = frame.readUInt16BE(2); // トランザクションID
    const seoj = frame.readUIntBE(4, 3); // 送信元オブジェクト
    const deoj = frame.readUIntBE(7, 3); // 宛先オブジェクト
    const esv = frame.readUInt8(10); // サービスコード
    const opc = frame.readUInt8(11); // プロパティ数

    const properties: EchonetProperty[] = [];
    let offset = 12;

    for (let i = 0; i < opc; i++) {
      if (frame.length < offset + 2) {
        throw new Error("Invalid frame: EPC or PDC is missing.");
      }

      const epc = frame.readUInt8(offset); // プロパティコード
      offset += 1;

      const pdc = frame.readUInt8(offset); // データ長
      offset += 1;

      if (frame.length < offset + pdc) {
        throw new Error("Invalid frame: EDT is incomplete.");
      }

      // PDCに基づきEDTをbigintとして取得
      let edt: bigint;
      if (pdc > 0) {
        edt = BigInt(
          `0x${frame.subarray(offset, offset + pdc).toString("hex")}`,
        );
      } else {
        edt = BigInt(0); // データ長が0の場合
      }
      offset += pdc;

      properties.push({ epc, pdc, edt });
    }

    return new EchonetData(tid, seoj, deoj, esv, properties);
  }

  getEdt(epc: number): number {
    const property = this.properties.find((property) => property.epc === epc);
    if (!property) {
      throw new Error(`Property not found.: ${epc}`);
    } else if (property.pdc > 6) {
      throw new Error(`Cannot convert to number type.: ${property.edt}`);
    }
    return Number(property.edt);
  }

  getEdtAsBigInt(epc: number): bigint {
    const property = this.properties.find((property) => property.epc === epc);
    if (!property) {
      throw new Error(`Property not found.: ${epc}`);
    }
    return property.edt;
  }

  isValidResponse(response: EchonetData): boolean {
    return (
      this.deoj === response.seoj &&
      this.seoj === response.deoj &&
      this.tid === response.tid
    );
  }

  toBuffer(): Buffer {
    const tidBuffer = Buffer.alloc(2);
    tidBuffer.writeUInt16BE(this.tid, 0);
    const seojBuffer = Buffer.alloc(3);
    seojBuffer.writeUIntBE(this.seoj, 0, 3);
    const deojBuffer = Buffer.alloc(3);
    deojBuffer.writeUIntBE(this.deoj, 0, 3);

    const opc = Buffer.from([this.properties.length]);
    const propertyData = Buffer.concat(
      this.properties.map(({ epc, pdc, edt }) => {
        const edtBuffer = pdc > 0 ? Buffer.alloc(pdc) : Buffer.alloc(0); // PDCが0の場合に空のBuffer
        if (pdc > 0) {
          // bigintをBufferに書き込み
          const edtHex = edt.toString(16).padStart(pdc * 2, "0"); // pdcバイト長に合わせる
          Buffer.from(edtHex, "hex").copy(edtBuffer);
        }
        return Buffer.concat([
          Buffer.from([epc]),
          Buffer.from([pdc]),
          edtBuffer,
        ]);
      }),
    );

    return Buffer.concat([
      Buffer.from([0x10, 0x81]), // ECHONET Lite 固定ヘッダー
      tidBuffer,
      seojBuffer,
      deojBuffer,
      Buffer.from([this.esv]), // サービスコード
      opc, // プロパティ数
      propertyData, // プロパティデータ
    ]);
  }

  toString(): string {
    const propertiesString = this.properties
      .map(
        ({ epc, pdc, edt }) =>
          `epc=0x${epc.toString(16).padStart(2, "0")}, pdc=${pdc}, edt=0x${edt.toString(16)}`,
      )
      .join(" | ");
    const all = this.toBuffer().toString("hex");

    return [
      `tid=0x${this.tid.toString(16).padStart(4, "0")}`,
      `seoj=0x${this.seoj.toString(16).padStart(6, "0")}`,
      `deoj=0x${this.deoj.toString(16).padStart(6, "0")}`,
      `esv=0x${this.esv.toString(16)}`,
      `properties=[${propertiesString}]`,
      `all=0x${all}`,
    ].join(" | ");
  }
}

export interface EchonetProperty {
  epc: number; // プロパティコード
  pdc: number; // データ長
  edt: bigint; // プロパティデータ
}
