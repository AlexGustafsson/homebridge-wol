# Wake on Lan plugin for Homebridge
### Turn your computer on and off through Siri
***

### Setting up

###### Installing

To install the plugin, head over to the machine with Homebridge set up and run
```
npm install -g homebridge-wol
```

_Note, homebridge-wol requires root permissions due to the use of pinging and magic packages. Start homebridge with sudo: `sudo homebridge` or change permissions accordingly._

###### Configuration

To make Homebridge aware of the new plugin, you will have to add it to your configuration usually found in `/root/.homebridge/config.json` or `/home/username/.homebridge/config.json` If the file does not exist, you may [create it](https://github.com/nfarina/homebridge/blob/master/config-sample.json). Somewhere inside that file you should see a key named `accessories`. This is where you can add your computer as shown here:

 ```json
"accessories": [
    {
      "accessory": "Computer",
      "name": "My Macbook",
      "mac": "<mac-address>",
      "ip": "192.168.1.51",
      "pingInterval": 45,
      "wakeGraceTime": 90,
      "shutdownGraceTime": 15,
      "shutdownCommand": "ssh 192.168.1.51 sudo shutdown -h now"
    },
    {
      "accessory": "Computer",
      "name": "My Gaming Rig",
      "mac": "<mac-address>",
      "ip": "192.168.1.151"
    },
    {
      "accessory": "Computer",
      "name": "Raspberry Pi",
      "mac": "<mac-address>",
      "ip": "192.168.1.251",
      "pingInterval": 45,
      "wakeGraceTime": 90,
      "shutdownGraceTime": 15,
      "shutdownCommand": "sshpass -p 'raspberry' ssh -oStrictHostKeyChecking=no pi@192.168.1.251 sudo shutdown -h now"
    }
]
```
___notice___: _the Raspberry Pi example uses the "sshpass" package to sign in on the remote host. The "-oStrictHostKeyChecking=no" parameter permits any key that the host may present. You should be using ssh keys to authenticate yourself._

###### Options

| Key       | Description                                                     | Required |
| --------- | --------------------------------------------------------------- | ---------|
| accessory | The type of accessory - has to be "Computer"                    | Yes      |
| name      | The name of the computer - used in HomeKit apps as well as Siri | Yes      |
| mac       | The computer's MAC address - used to send Magic Packets         | Yes      |
| ip        | The IPv4 address of the computer - used to check current status | No       |
| pingInterval      | Ping interval in seconds, only used if `ip` is set, default `25`                      | No       |
| wakeGraceTime     | Number of seconds to wait after wake-up before checking online status, default `30`   |  No       |
| shutdownGraceTime | Number of seconds to wait after shutdown before checking offline status, default `15` | No       |
| shutdownCommand   | Command to run in order to shut down the remote machine                               | No       |


### Usage

To use this package you need a HomeKit-enabled app. When you've gone through the setup there should be a switch showing in the app with the name of your computer. If the computer has been configured properly, it will turn on when the switch is flicked. if there is configuration to support it (see the above table), the device will turn off. Note, even though we use the word "computer" throughout the docs, any device should be supported.

If you haven't yet found an applicable app, I recommend the following:

##### [iDevices](https://itunes.apple.com/se/app/idevices-connected/id682656390?mt=8)
iDevices is a great app to configure everything HomeKit related. It offers great control over houses, rooms, scenes and more.

#### [Beam](https://itunes.apple.com/us/app/beam-elevate-your-home/id1038439712?mt=8)
Beam is a stylish, minimalistic approach to a home remote. Whilst not offering the configurability of iDevices, Beam is targeting the everyday use with a great user experience.
