# Wake on Lan plugin for Homebridge
### Turn your computer on through Siri
***

### Setting up

###### Installing

To install the plugin, head over to the machine with Homebridge set up and run
```
npm install -g homebridge-wol
```

###### Configuration

To make Homebridge aware of the new plugin, you will have to add it to your configuration usually found in `/root/.homebridge/config.json`. Somewhere inside that file you should see a key named `accessories`. This is where you can add your computer as shown here:

 ```json
"accessories": [
    {
      "accessory": "Computer",
      "name": "My Gaming Rig",
      "mac": "<mac-address>",
      "ip": "192.168.1.151"
    },
    {
      "accessory": "Computer",
      "name": "My Macbook",
      "mac": "<mac-address>",
      "pingInterval": 45,
      "wakeGraceTime": 90,
      "shutdownGraceTime": 15,
      "shutdownCommand": "ssh 192.168.1.1 sudo shutdown -h now"
    }
]
```

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
| shutdownCommand   | Command to run in order to shut down the remote mchine                                | No       |


### Usage

To use this package you need a HomeKit-enabled app. When you've gone through the setup there should be a switch showing in the app with the name of your computer. If the switch is off and you tap it, your computer will be turned on. However, you cannot turn off your computer with this plugin, so by switching the switch off - nothing will happen and it will soon go back to being on. Whenever the computer shuts down the switch will be automatically switched off.

If you haven't yet found an applicable app, I recommend the following:

##### [iDevices](https://itunes.apple.com/se/app/idevices-connected/id682656390?mt=8)
iDevices is a great app to configure everything HomeKit related. It offers great control over houses, rooms, scenes and more.

#### [Beam](https://itunes.apple.com/us/app/beam-elevate-your-home/id1038439712?mt=8)
Beam is a stylish, minimalistic approach to a home remote. Whilst not offering the configurability of iDevices, Beam is targeting the everyday use with a great user experience.
