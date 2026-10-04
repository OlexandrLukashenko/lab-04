export function createLobbyDom(root,lobby){
 const panel=document.createElement('section');panel.className='lobby';panel.innerHTML=`<div class="lobby-card"><h1>FPV DRONE ARENA</h1><p>Node.js · WebSocket Lobby</p><label>Ім'я <input id="playerName" maxlength="18" placeholder="Pilot"></label><div id="rooms" class="rooms">Завантаження кімнат…</div><p id="lobbyError" class="error"></p></div>`;root.append(panel);const rooms=panel.querySelector('#rooms');
 lobby.addEventListener('rooms',({detail})=>{rooms.innerHTML='';for(const room of detail.rooms??detail){const b=document.createElement('button');b.className='room';b.textContent=`${room.name} — ${room.players} players`;b.onclick=()=>lobby.join(panel.querySelector('#playerName').value.trim()||'Pilot',room);rooms.append(b);}});
 lobby.addEventListener('error',({detail})=>panel.querySelector('#lobbyError').textContent=`Лобі: ${detail.message}`);
 return {panel,destroy:()=>panel.remove()};
}
