import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import bgImg from './assets/Main_BG.jpg';
import RoleSelect from './components/RoleSelect';
import JoinRoom from './components/JoinRoom';
import ConversationScreen from './components/ConversationScreen';
import SignPreview from './components/SignPreview';
import { isRoomCode } from './api/conversation';
import './App.css';
/**
 * Warm Hands clinic conversation.
 *   1. Choose Doctor or Patient on this device.
 *   2. Doctor opens a 4-digit room; the patient joins it from their own device
 *      on the same Wi-Fi / hotspot (or opens the link the doctor's screen shows).
 *   3. Doctor types/speaks → patient sees MSL. Patient signs → doctor reads text.
 *
 * The role and room live in the URL (?role=…&room=…) so a refresh rejoins.
 */
function readUrl() {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const room = params.get('room') ?? '';
    return { role: role === 'doctor' || role === 'patient' ? role : null, room: isRoomCode(room) ? room : '' };
}
function App() {
    const [role, setRole] = useState(() => readUrl().role);
    const [room, setRoom] = useState(() => readUrl().room);
    useEffect(() => {
        const params = new URLSearchParams();
        if (role)
            params.set('role', role);
        if (role && room)
            params.set('room', room);
        const query = params.toString();
        window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }, [role, room]);
    if (new URLSearchParams(window.location.search).has('preview'))
        return _jsx(SignPreview, { query: window.location.search });
    return (_jsxs("div", { className: "min-h-dvh w-full bg-cover bg-center bg-no-repeat", style: { backgroundImage: `url(${bgImg})` }, children: [!role && _jsx(RoleSelect, { onSelect: setRole }), role && !room && _jsx(JoinRoom, { role: role, onJoin: setRoom, onBack: () => setRole(null) }), role && room && _jsx(ConversationScreen, { role: role, code: room, onLeave: () => setRoom('') }, `${role}-${room}`)] }));
}
export default App;
