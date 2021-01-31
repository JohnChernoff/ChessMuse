//TODO: game over sounds, melodic options, UI tweaks

let current_game = new Chess();
let user_id = null;
let current_gid = null;
let lich_sock = null;
let queue = [];
let playing_black = false;
let black_player = "", white_player = "";
let time_factor = 1, time_remaining = 999;
let follow_timer = null;
let tv_timer = null;

runLichessSocket();

function startTV() {
    getTV().then(id => { //console.log((id));
        if (id !== null) followGame(id);
        else tv_timer = setTimeout(startTV,2500);
    });
}

function getTV() {
    return fetch("https://lichess.org/tv/channels",{headers:{'Accept':'application/json'}})
        .then(response => response.text())
        .then(text => JSON.parse(text))
        .then(json => fetchGame(json.Bullet.gameId))
        .then(game => game.status === "started" ? game.id : null);
}

function followUser() {
    user_id = document.getElementById("input_user_id").value;
    if (current_gid === null) {
        console.log("Fetching User: " + user_id);
        fetch("https://lichess.org/api/users/status?ids=" + user_id,
            {headers:{'Accept':'application/json'}})
            .then(response => response.text())
            .then(text => JSON.parse(text))
            .then(json => { //console.log(json);
                if (json[0].playing) getGIDFromUser().then(gid => followGame(gid));
            });
    }
    if (play_mode === MODE_LICHESS_FOLLOW) follow_timer = setTimeout(followUser,5000);
}

function getGIDFromUser() {
    return fetch("https://lichess.org/api/user/" + user_id,{headers:{'Accept':'application/json'}})
         .then(response => response.text())
         .then(text => JSON.parse(text))
         .then(json => getGIDFromURL(json.playing));
}

function getGIDFromURL(url) { //console.log(url);
    if (url === "undefined") return null;
    let path_segments = url.split("/");
    playing_black = path_segments[path_segments.length-1].toLowerCase() === "black";
    return path_segments[path_segments.length-2];
}

function followGame(gid) { //console.log(gid);
    if (gid == null || (play_mode !== MODE_LICHESS_FOLLOW && play_mode !== MODE_LICHESS_TV)) return;
    current_game.reset();
    current_gid = gid; setPlayers(current_gid); console.log("Beginning/resuming Game: " + current_gid);
    let message = JSON.stringify({ t: 'startWatching', d: current_gid });
    send(lich_sock, message);
}

function setPlayers(gid) {
    fetchGame(gid).then(json => { //console.log("Setting players for game: " + json.id);
        if (json.id === current_gid) {
            black_player = getUser(json.players.black);
            white_player = getUser(json.players.white);
        }
    });
}

function getUser(json) {
    if (json.user === undefined) return "AI Level " + json.aiLevel;
    return (json.user.title ? json.user.title + " " : "") + json.user.name + " (" + json.rating + ")";
}

function fetchGame(gid) {
    return fetch("https://lichess.org/game/export/" + gid,
        {headers:{'Accept':'application/json'}})
        .then(response => response.text())
        .then(txt => JSON.parse(txt))
}

function send(sock, message) {
    if (sock.readyState === 1) sock.send(message); else queue.push(message);
}

function runLichessSocket() {
    const baseURL = 'wss://socket.lichess.org';
    const endpoint = '/api/socket';
    const url = baseURL + endpoint;
    lich_sock = new WebSocket(url);

    lich_sock.onopen = function () {
        console.log("Connected to Lichess...");
        while (queue.length > 0) {
            let message = queue.pop();
            lich_sock.send(message);
        }
    }

    lich_sock.onerror = function (error) { console.error(error); }

    lich_sock.onmessage = function (e) { //console.log(("Message: ") + e.data);
        let data = JSON.parse(e.data);
        if (data.t) { //console.log(data);
            if (data.d.id && data.d.id !== current_gid) return;
            if (data.t === "fen") {
                setCurrentFEN(data.d.fen + " KQkq - 1 1");
                if (!chk_mute_lichess.checked) playFEN(current_FEN, data.d.lm);
                let pct = playing_black ? data.d.bc/data.d.wc : data.d.wc/data.d.bc;
                setPlayTime(pct, playing_black ? data.d.bc : data.d.wc);
                let black_clock_str = new Date(data.d.bc * 1000).toISOString().substr(11, 8);
                let white_clock_str = new Date(data.d.wc * 1000).toISOString().substr(11, 8);
                updateGameStatus(black_player + " " + black_clock_str , white_player + " " + white_clock_str);
            }
            else if (data.t === "finish") {
                console.log("Game finished");
                current_gid = null;
                if (play_mode === MODE_LICHESS_TV) startTV();
            }
        }
    }

    lich_sock.onclose = function () { //runLichessSocket(); followGame(current_gid);
    }
}

function setPlayTime(pct, t) {
    time_factor = pct;
    time_remaining = t;
}

function updateGameStatus(white,black) {
    document.getElementById("white_box").textContent = white;
    document.getElementById("black_box").textContent = black;
}
