// server/index.ts
import { DeskThing } from '@deskthing/server';
import mqtt from 'mqtt';

let mqttClient: mqtt.MqttClient | null = null;
let lastTelemetry: any = null; 
let loopInterval: NodeJS.Timeout | null = null; 

const initCloudMqtt = (token: string, userId: string, sn: string, region: string) => {
  if (mqttClient) mqttClient.end();

  const brokerHost = region.toLowerCase() === 'china' 
    ? 'cn.mqtt.bambulab.com' 
    : 'us.mqtt.bambulab.com'; 

  const cloudUsername = `u_${userId.trim()}`;

  DeskThing.base?.logInfo(`Attempting MQTT handshake to ${brokerHost} for user ${cloudUsername}...`);

  mqttClient = mqtt.connect(`mqtts://${brokerHost}:8883`, {
    username: cloudUsername,
    password: token,
    clientId: `deskthing-${sn}`,
    rejectUnauthorized: false,
    keepalive: 60,
    reconnectPeriod: 5000
  });

  mqttClient.on('connect', () => {
    DeskThing.base?.logInfo(`✅ Successfully connected to Bambu MQTT! Subscribing to device...`);
    mqttClient?.subscribe(`device/${sn}/report`);

    const pushAllCommand = JSON.stringify({
      pushing: {
        sequence_id: "1",
        command: "pushall"
      }
    });
    mqttClient?.publish(`device/${sn}/request`, pushAllCommand);

    if (loopInterval) clearInterval(loopInterval);
    loopInterval = setInterval(() => {
      if (lastTelemetry) {
        DeskThing.send({ type: 'printer-update', payload: lastTelemetry });
      }
    }, 2000);
  });

  mqttClient.on('error', (err) => {
    DeskThing.base?.logError(`❌ MQTT Connection Error: ${err.message}`);
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const parsed = JSON.parse(message.toString());
      const telemetry = parsed?.print || parsed?.msg;
      
      if (telemetry) {
        const amsData = telemetry.ams?.ams?.[0]?.tray?.map((t: any) => ({
          color: t.tray_color ? `#${t.tray_color.substring(0, 6)}` : '#222222',
          type: t.tray_type || 'EMPTY'
        })) || lastTelemetry?.amsTrays || Array(4).fill({ color: '#222222', type: 'EMPTY' });

        let parsedChamber = lastTelemetry?.chamberTemp ?? 0;
        
        if (telemetry.device?.ctc?.info?.temp !== undefined) {
          parsedChamber = Number(telemetry.device.ctc.info.temp) & 0xFFFF;
        } else if (telemetry.chamber_temper !== undefined) {
          parsedChamber = Number(telemetry.chamber_temper);
        } else if (telemetry.cham_temper !== undefined) {
          parsedChamber = Number(telemetry.cham_temper);
        }

        // Intercept the mechanical sub-state 
        let currentSubState = lastTelemetry?.subState ?? 0;
        if (telemetry.st_id !== undefined) currentSubState = Number(telemetry.st_id);
        else if (telemetry.mc_print_sub_stage !== undefined) currentSubState = Number(telemetry.mc_print_sub_stage);

        lastTelemetry = {
          state: telemetry.gcode_state || lastTelemetry?.state || 'IDLE',
          progress: telemetry.mc_percent ?? lastTelemetry?.progress ?? 0,
          remaining: telemetry.mc_remaining_time ?? lastTelemetry?.remaining ?? 0,
          nozzleTemp: telemetry.nozzle_temper !== undefined ? Number(telemetry.nozzle_temper) : (lastTelemetry?.nozzleTemp ?? 0),
          bedTemp: telemetry.bed_temper !== undefined ? Number(telemetry.bed_temper) : (lastTelemetry?.bedTemp ?? 0),
          chamberTemp: parsedChamber,
          fileName: telemetry.subtask_name || lastTelemetry?.fileName || 'Ready',
          currentLayer: telemetry.layer_num ?? lastTelemetry?.currentLayer ?? 0,
          totalLayers: telemetry.total_layer_num ?? lastTelemetry?.totalLayers ?? 0,
          speedProfile: telemetry.spd_lvl ?? lastTelemetry?.speedProfile ?? 2,
          fanPart: telemetry.cooling_fan_speed ?? lastTelemetry?.fanPart ?? 0,
          fanAux: telemetry.big_fan1_speed ?? lastTelemetry?.fanAux ?? 0,
          fanChamber: telemetry.big_fan2_speed ?? lastTelemetry?.fanChamber ?? 0,
          activeTray: telemetry.ams?.tray_now ?? lastTelemetry?.activeTray ?? 255,
          amsTrays: amsData,
          subState: currentSubState
        };
        DeskThing.send({ type: 'printer-update', payload: lastTelemetry });
      }
    } catch (err) {
      // Catch parse errors silently
    }
  });
};

const checkAndConnect = (settings: any) => {
  const accessToken = settings?.accessToken?.value || settings?.accessToken || "AQBvxn-yT5Ku-TDb8kieTKqcd9a9NBZ7jIcyuBLZEdkYFrq-Q0JyquqpZUYxz5u61x6SwhPFzSJIgP1CkKauW92jDiYVM_rlGoyNlfj9fA99D-2vVsScsS9xzl1KNwSg5PVrXdtZDSqsNwWd";
  const bambuUserId = settings?.bambuUserId?.value || settings?.bambuUserId || "3442918350";
  const serialNumber = settings?.serialNumber?.value || settings?.serialNumber || "22E8AJ631100667";
  const region = settings?.region?.value || settings?.region || 'Americas';

  if (accessToken && bambuUserId && serialNumber) {
    initCloudMqtt(accessToken, bambuUserId, serialNumber, region);
    return true;
  }
  return false;
};

DeskThing.on('start', async () => {
  try {
    const configSettings = {
      accessToken: { label: "Bambu Access Token", type: "string", value: "AQBvxn-yT5Ku-TDb8kieTKqcd9a9NBZ7jIcyuBLZEdkYFrq-Q0JyquqpZUYxz5u61x6SwhPFzSJIgP1CkKauW92jDiYVM_rlGoyNlfj9fA99D-2vVsScsS9xzl1KNwSg5PVrXdtZDSqsNwWd", description: "Your account cookie token" },
      bambuUserId: { label: "Bambu Account User ID (uid)", type: "string", value: "3442918350", description: "The numerical ID" },
      serialNumber: { label: "Printer Serial Number", type: "string", value: "22E8AJ631100667", description: "The 15-character serial number" },
      region: { label: "Server Region", type: "string", value: "Americas", description: "Set to 'Americas' or 'China'" }
    };

    if (typeof DeskThing.addSettings === 'function') {
      DeskThing.addSettings(configSettings);
    }
  } catch (err) {
    DeskThing.base?.logError("Could not register settings menu, skipping to connect phase...");
  }

  setTimeout(() => { checkAndConnect(DeskThing.settings); }, 500);
});

DeskThing.on('settings', async (newConfig) => { checkAndConnect(newConfig); });