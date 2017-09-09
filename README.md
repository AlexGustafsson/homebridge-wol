# Wake on Lan plugin for Homebridge
### Turn your PCs, laptops, servers and more on and off through Siri
***


> Hello! The long-overdue launch of the new homebridge-wol is upon us. If you've been using the package before, re-read this document to make sure you're up to date on breaking changes etc.

### Setting up

###### Installing

To install the plugin, head over to the machine with Homebridge set up and run the following commands:
```
# Download the repository
npm install -g homebridge-wol
```

_Note, homebridge-wol requires root permissions due to the use of pinging and magic packages. Start homebridge with sudo: `sudo homebridge` or change capabilities accordingly (´setcap cap_net_raw=pe /path/to/bin/node`)._

###### Configuration

To make Homebridge aware of the new plugin, you will have to add it to your configuration usually found in `/root/.homebridge/config.json` or `/home/username/.homebridge/config.json` If the file does not exist, you may [create it](https://github.com/nfarina/homebridge/blob/master/config-sample.json). Somewhere inside that file you should see a key named `accessories`. This is where you can add your computer as shown here:

 ```json
"accessories": [
    {
      "accessory": "NetworkDevice",
      "name": "My Macbook",
      "mac": "<mac-address>",
      "ip": "192.168.1.51",
      "pingInterval": 45,
      "wakeGraceTime": 90,
      "shutdownGraceTime": 15,
      "shutdownCommand": "ssh 192.168.1.51 sudo shutdown -h now"
    },
    {
      "accessory": "NetworkDevice",
      "name": "My Gaming Rig",
      "mac": "<mac-address>",
      "ip": "192.168.1.151"
    },
    {
      "accessory": "NetworkDevice",
      "name": "Raspberry Pi",
      "mac": "<mac-address>",
      "ip": "192.168.1.251",
      "pingInterval": 45,
      "wakeGraceTime": 90,
      "shutdownGraceTime": 15,
      "shutdownCommand": "sshpass -p 'raspberry' ssh -oStrictHostKeyChecking=no pi@192.168.1.251 sudo shutdown -h now"
    },
    {
      "accessory": "NetworkDevice",
      "name": "My NAS",
      "ip": "192.168.1.148",
      "log": false
    }
]
```
__note__: _the accessory name has recently been renamed to "NetworkDevice" to address [this issue](https://github.com/AlexGustafsson/homebridge-wol/issues/17)_

___notice___: _the Raspberry Pi example uses the "sshpass" package to sign in on the remote host. The "-oStrictHostKeyChecking=no" parameter permits any key that the host may present. You should be using ssh keys to authenticate yourself._

###### Options

| Key       | Description                                                     | Required |
| --------- | --------------------------------------------------------------- | ---------|
| accessory | The type of accessory - has to be "NetworkDevice"               | Yes      |
| name      | The name of the device - used in HomeKit apps as well as Siri, default `My Computer` | Yes      |
| mac       | The device's MAC address - used to send Magic Packets         | No       |
| ip        | The IPv4 address of the device - used to check current status | No       |
| pingInterval      | Ping interval in seconds, only used if `ip` is set, default `25`                      | No       |
| wakeGraceTime     | Number of seconds to wait after wake-up before checking online status, default `30`   |  No       |
| shutdownGraceTime | Number of seconds to wait after shutdown before checking offline status, default `15` | No       |
| shutdownCommand   | Command to run in order to shut down the remote machine                               | No       |
| log | Whether or not the plugin should log status messages, default `true` | No |

_Note, although neither mac or ip are required, at last one is needed for the plugin to be functional. One can however leave out mac and only use ip to be able to check the status of the device without being able to turn it on._

### Usage (pre iOS 10)

To use this package you need a HomeKit-enabled app. When you've gone through the setup there should be a switch showing in the app with the name of your device. If the device has been configured properly, it will turn on when the switch is flicked. If there is configuration to support it (see the above table), the device will turn off.

If you haven't yet found an applicable app, I recommend the following:

##### [iDevices](https://itunes.apple.com/se/app/idevices-connected/id682656390?mt=8)
iDevices is a great app to configure everything HomeKit related. It offers great control over houses, rooms, scenes and more.

#### [Beam](https://itunes.apple.com/us/app/beam-elevate-your-home/id1038439712?mt=8)
Beam is a stylish, minimalistic approach to a home remote. Whilst not offering the configurability of iDevices, Beam is targeting the everyday use with a great user experience.

### Contibution

Any contribution is welcome. If you're not able to code it yourself, perhaps someone else is - so post an issue if there's anything on your mind.

###### Development

Clone the repository:
```
git clone https://github.com/AlexGustafsson/homebridge-wol.git && cd homebridge-wol
```

Set up for development:
```
npm install && npm link
```

Now follow the configuration of homebridge / the plugin as per usual.

Follow the conventions enforced:
```
npm test
```
