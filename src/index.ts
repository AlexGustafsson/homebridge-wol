import {
  API,
  Logging,
  PlatformConfig,
  PlatformAccessory,
  DynamicPlatformPlugin,
  Service,
  Characteristic,
  CharacteristicValue
} from 'homebridge';

// @ts-ignore
import wol from 'wake_on_lan';

export = (api: API) => {
  api.registerPlatform('WakeOnLanPlatform', WakeOnLanPlatform);
};

class WakeOnLanPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  private readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.log.info('WakeOnLanPlatform finished initializing!');

    api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    if (!this.config.devices || !Array.isArray(this.config.devices)) {
      this.log.warn('No devices configured for Wake On LAN.');
      return;
    }

    for (const device of this.config.devices) {
      const uuid = this.api.hap.uuid.generate(device.name + device.mac);

      let accessory = this.accessories.find(acc => acc.UUID === uuid);
      if (!accessory) {
        this.log.info('Adding new accessory:', device.name);
        accessory = new this.api.platformAccessory(device.name, uuid);
        accessory.context.device = device;
        this.api.registerPlatformAccessories('homebridge-wake-on-lan', 'WakeOnLanPlatform', [accessory]);
      } else {
        this.log.info('Restoring existing accessory from cache:', device.name);
      }

      new WakeOnLanAccessory(this, accessory, device);
    }
  }
}

class WakeOnLanAccessory {
  private service: Service;

  constructor(
    private readonly platform: WakeOnLanPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: any
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, device.manufacturer || 'Unknown')
      .setCharacteristic(this.platform.Characteristic.Model, device.model || 'WOL Device')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, device.mac);

    this.service = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch, device.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    if (value as boolean) {
      this.platform.log.info(`Sending Wake-on-LAN packet to ${this.device.mac}`);
      try {
        // @ts-ignore
        wol.wake(this.device.mac, { address: this.device.address || '255.255.255.255' });
        this.platform.log.info(`WOL packet sent to ${this.device.mac}`);
      } catch (err) {
        this.platform.log.error(`Failed to send WOL packet: ${err}`);
      }
    }
    // Optionally, turn off does nothing or could send shutdown via SSH if configured
  }

  async getOn(): Promise<CharacteristicValue> {
    // HomeKit Switches require get; always report OFF (stateless)
    return false;
  }
}