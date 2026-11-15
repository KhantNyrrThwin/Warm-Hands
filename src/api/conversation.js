export const SENDER = { doctor: 'ဆရာဝန်', patient: 'လူနာ' };
export const newRoomCode = () => String(Math.floor(1000 + Math.random() * 9000));
export const newMessageId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const isRoomCode = (value) => /^\d{4}$/.test(value);
/** LAN addresses of the host computer, so the doctor can tell the patient where to connect. */
export async function getJoinAddresses() {
    const { protocol, hostname, port } = window.location;
    const suffix = port ? `:${port}` : '';
    const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    if (!local)
        return [`${protocol}//${hostname}${suffix}`];
    try {
        const response = await fetch('/api/network');
        if (!response.ok)
            return [];
        const data = (await response.json());
        return (data.addresses ?? []).map((address) => `https://${address}${suffix}`);
    }
    catch {
        return [];
    }
}
export function joinRoom(code, role, handlers) {
    let closed = false;
    let socket = null;
    let local = null;
    let retry = 0;
    let retryTimer = 0;
    let everOpened = false;
    const outbox = [];
    const connect = () => {
        if (closed)
            return;
        handlers.onStatus('connecting');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/api/room/${code}?role=${role}`);
        socket = ws;
        ws.onopen = () => {
            everOpened = true;
            retry = 0;
            handlers.onStatus('online');
            while (outbox.length)
                ws.send(JSON.stringify({ type: 'message', message: outbox.shift() }));
        };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(String(event.data));
                if (data.type === 'history')
                    handlers.onHistory(data.messages);
                else if (data.type === 'presence')
                    handlers.onPresence({ doctor: !!data.doctor, patient: !!data.patient });
                else if (data.type === 'message')
                    handlers.onMessage(data.message);
                else if (data.type === 'ack' && data.id)
                    handlers.onAck?.(String(data.id));
            }
            catch {
                /* ignore malformed frames */
            }
        };
        ws.onclose = () => {
            if (closed || socket !== ws)
                return;
            socket = null;
            if (!everOpened && retry >= 1) {
                // Relay server is not running: keep working between tabs on this device.
                local = localChannel(code, role, handlers);
                handlers.onStatus('local');
                while (outbox.length)
                    local.send(outbox.shift());
                return;
            }
            handlers.onStatus('offline');
            handlers.onPresence({ doctor: role === 'doctor', patient: role === 'patient' });
            retry += 1;
            retryTimer = window.setTimeout(connect, Math.min(1000 * 2 ** retry, 8000));
        };
    };
    connect();
    return {
        send(message) {
            if (local)
                return local.send(message);
            if (socket?.readyState === WebSocket.OPEN)
                socket.send(JSON.stringify({ type: 'message', message }));
            else
                outbox.push(message);
        },
        close() {
            closed = true;
            window.clearTimeout(retryTimer);
            socket?.close();
            local?.close();
        },
    };
}
/** Same-device fallback (two tabs) using BroadcastChannel + sessionless storage. */
function localChannel(code, role, handlers) {
    const key = `warm-hands-room-${code}`;
    const channel = new BroadcastChannel(key);
    const peer = role === 'doctor' ? 'patient' : 'doctor';
    let peerSeen = 0;
    const readHistory = () => {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        }
        catch {
            return [];
        }
    };
    const writeHistory = (messages) => {
        try {
            localStorage.setItem(key, JSON.stringify(messages.slice(-200)));
        }
        catch {
            /* storage unavailable */
        }
    };
    handlers.onHistory(readHistory());
    const report = () => handlers.onPresence({ [role]: true, [peer]: Date.now() - peerSeen < 5000 });
    channel.onmessage = (event) => {
        const data = event.data;
        if (data.role === peer)
            peerSeen = Date.now();
        if (data.type === 'bye' && data.role === peer)
            peerSeen = 0;
        if (data.type === 'message' && data.message)
            handlers.onMessage(data.message);
        report();
    };
    const beat = () => channel.postMessage({ type: 'beat', role });
    beat();
    report();
    const timer = window.setInterval(() => { beat(); report(); }, 2000);
    return {
        send(message) {
            writeHistory([...readHistory(), message]);
            channel.postMessage({ type: 'message', role, message });
            handlers.onAck?.(message.id);
        },
        close() {
            window.clearInterval(timer);
            channel.postMessage({ type: 'bye', role });
            channel.close();
        },
    };
}
