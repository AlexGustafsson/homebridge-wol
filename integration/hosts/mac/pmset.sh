#!/usr/bin/env bash

# This script mocks the pmset command

if [[ "$*" == "" ]]; then
    cat <<EOF
Usage: pmset <options>
See pmset(1) for details: 'man pmset'
EOF
elif [[ $* == "-g" ]]; then
  cat <<EOF
System-wide power settings:
Currently in use:
 standbydelaylow      10800
 standby              1
 halfdim              1
 hibernatefile        /var/vm/sleepimage
 powernap             0
 gpuswitch            2
 disksleep            10
 standbydelayhigh     86400
 sleep                15 (sleep prevented by sharingd, useractivityd)
 autopoweroffdelay    28800
 hibernatemode        3
 autopoweroff         1
 ttyskeepawake        1
 displaysleep         15
 highstandbythreshold 50
 acwake               0
 lidwake              1
EOF
elif [[ "$*" == "-g powerstate" ]]; then
  cat << EOF

Driver ID  Current State  Max State  Current State Description
IOPMrootDomain              4          4  ON
AppleFDEKeyStore            1          1  ON
AppleACPIPCI                3          3  ON
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
AppleBacklightDisplay       3          3  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
NVDA                        2          2  USEABLE
AppleHDAController          2          2  USEABLE
AppleHDAController          2          2  USEABLE
AppleHDAHDMI_DPDriver       1          1  USEABLE
AppleThunderboltHAL         0          0  None
IOThunderboltController     0          0  None
IOThunderboltSwitchType2    0          0  None
AppleIntelFramebuffer       2          2  USEABLE
AppleUSB20HubPort           1          1  LOW_POWER
AppleUSB20HubPort           1          1  LOW_POWER
AppleUSB20HubPort           1          1  LOW_POWER
AppleUSB20HubPort           1          1  LOW_POWER
AppleUSB20HubPort           1          1  LOW_POWER
AppleUSB20HubPort           1          1  LOW_POWER
AppleUSB20HubPort           1          1  LOW_POWER
AppleUSB20HubPort           1          1  LOW_POWER
AppleUSB20HubPort           1          1  LOW_POWER
BroadcomBluetoothHostCon    1          1  LOW_POWER
AppleIntelMEIDriver         1          1  ON
AppleMEClientController     1          1  USEABLE
AppleHDAController          2          2  USEABLE
AppleHDAController          2          2  USEABLE
AppleHDAHDMI_DPDriver       1          1  USEABLE
AppleHDADriver              1          1  USEABLE
AppleCamIn                  0          0  None
AppleAHCI                   2          2  USEABLE
AppleLPC                    1          1  USEABLE
AppleSMC                    1          1  USEABLE
AppleLMUController          1          1  ON
AppleSmartBatteryManager    1          1  ON
AppleRTC                    2          2  None
AppleUSBLegacyRoot          4          4  USEABLE
AppleSystemPolicy           1          1  ON
X86PlatformPlugin           1          1  USEABLE
AppleSSE                    1          1  ON
IODisplayWrangler           4          4  USEABLE
com_cycling74_driver_Sou    1          1  USEABLE
AppleMuxControl             1          1  USEABLE
com_apple_driver_AppleUS    0          2  None
com_apple_driver_AppleUS    0          0  None
EOF
elif [[ "$*" == "-g powerstate IODisplayWrangler" ]]; then
  cat << EOF

  Driver ID  Current State  Max State  Current State Description
IODisplayWrangler           4          4  USEABLE
EOF
fi
