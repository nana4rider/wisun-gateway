import { WiSunConnectorModels } from "@/connector/WiSunConnectorModel";
import { cleanEnv, num, port, str } from "envalid";

const env = cleanEnv(process.env, {
  MQTT_BROKER: str({ desc: "MQTTブローカー", example: "mqtt://localhost" }),
  MQTT_USERNAME: str({ desc: "MQTTユーザ名", default: undefined }),
  MQTT_PASSWORD: str({ desc: "MQTTパスワード", default: undefined }),
  MQTT_TASK_INTERVAL: num({ desc: "MQTTタスク実行間隔", default: 100 }),
  ENTITY_QOS: num({
    desc: "エンティティのQOS設定",
    choices: [0, 1, 2],
    default: 1,
  }),
  LOG_LEVEL: str({ default: "info", desc: "ログ出力" }),
  HA_DISCOVERY_PREFIX: str({
    desc: "https://www.home-assistant.io/integrations/mqtt/#discovery-options",
    default: "homeassistant",
  }),
  PORT: port({
    desc: "ヘルスチェック用HTTPサーバーのポート",
    default: 3000,
  }),
  AVAILABILITY_INTERVAL: num({
    desc: "オンライン状態を送信する間隔",
    default: 10000,
  }),
  AUTO_REQUEST_INTERVAL: num({
    desc: "エンティティの更新間隔",
    default: 60000,
  }),
  ECHONET_GET_TIMEOUT: num({
    desc: "GET要求のタイムアウト",
    default: 8000, // 4000msくらいはかかる
  }),
  WISUN_CONNECTOR_MODEL: str({
    desc: "Wi-SUNコネクタのモデル",
    choices: WiSunConnectorModels,
  }),
  WISUN_CONNECTOR_DEVICE_PATH: str({
    desc: "Wi-SUNコネクタのデバイスパス",
    default: "/dev/ttyUSB0",
    example: "/dev/ttyUSB0 or COM3",
  }),
  WISUN_SCAN_RETRIES: num({ desc: "スキャンのリトライ回数", default: 5 }),
  PAN_INFO_PATH: str({
    desc: "PAN情報をキャッシュするファイルパス",
    default: ".paninfo.json",
  }),
  ROUTE_B_ID: str({ desc: "Bルート認証ID" }),
  ROUTE_B_PASSWORD: str({ desc: "Bルートパスワード" }),
});

export default env;
