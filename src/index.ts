import {API} from "homebridge";

import NetworkDevice from "./network-device";

export default function (api: API) {
  api.registerAccessory("homebridge-wol", "NetworkDevice", NetworkDevice);
}
