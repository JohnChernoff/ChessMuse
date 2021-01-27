let current_game = new Chess();
let user_id, current_gid;
let gameSock = null;
let pinger = null;
let playingBlack = false;
let timeDiff = 0;
let lichess = false;
let blackPlayer = "", whitePlayer = "";
let timeFactor = 1;
let timeRemaining = 999;

function toggleLichess() {
    let button = document.getElementById("lichess_butt");
    lichess = !lichess;
    if (lichess) {
        button.innerText = "UnWatch";
        followLichess();
    }
    else {
        button.innerText = "Watch";
        if (gameSock != null) gameSock.close();
    }
}

function followLichess() {
    if (!lichess) return;
    user_id = document.getElementById("input_user_id").value;
    if (gameSock === null && user_id !== "") {
        console.log("Fetching User: " + user_id);
        fetch("https://lichess.org/api/users/status?ids=" + user_id,
            {headers:{'Accept':'application/json'}})
            .then(response => response.text())
            .then(text => JSON.parse(text))
            .then(json => { //console.log(json);
                if (json[0].playing) getGID();
            });
    }
    if (lichess) setTimeout(followLichess,5000);
}

function getGID() {
    fetch("https://lichess.org/api/user/" + user_id,{headers:{'Accept':'application/json'}})
         .then(response => response.text())
         .then(text => JSON.parse(text))
         .then(json => initLichessSocket(getGIDFromURL(json.playing)));
}

function getGIDFromURL(url) {
    console.log(url);
    if (url === "undefined") return null;
    let bits = url.split("/");
    playingBlack = bits[bits.length-1].toLowerCase() === "black";
    return bits[bits.length-2];
}

function setPlayers(json) {
    console.log("Setting players for game: " + json.id);
    if (json.id === current_gid) {
        blackPlayer = getUser(json.players.black);
        whitePlayer = getUser(json.players.white);
    }
}

function getUser(json) {
    if (json.user === undefined) return "AI Level " + json.aiLevel;
    return (json.user.title ? json.user.title + " " : "") + json.user.name + " (" + json.rating + ")";
}

function initLichessSocket(gid) {
    if (gid == null) return; current_gid = gid;
    current_game.reset(); //console.log("Beginning/resuming Game: " + current_gid);

    fetch("https://lichess.org/api/user/" + user_id + "/current-game",
    {headers:{'Accept':'application/json'}})
        .then(response => response.text())
        .then(txt => JSON.parse(txt))
        .then(json => setPlayers(json));

    let url = "wss://socket.lichess.org/watch/" + current_gid + "/black/v5?sri=zug999";
    gameSock = new WebSocket(url);

    gameSock.onopen = function(e) { //console.log("Open event: " + e);
        //updateStatus("New Game: " + current_gid);
        pinger = setInterval(function() {
            if (gameSock.readyState === WebSocket.OPEN) gameSock.send("{\"t\":\"p\",\"v\":9999999}");
        }, 2000);
    };

    gameSock.onclose = function(event) {
        console.log("Socket closed on game: " + current_gid);
        if (event.wasClean) {
            console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else { // e.g. server process killed or network down (event.code is usually 1006 in this case)
            console.log('[close] Connection died');
        }
        clearInterval(pinger);
        gameSock = null;
    };

    gameSock.onmessage = function(event) {
        //console.log(`[message] Data received from server: ${event.data}`);
        let data = JSON.parse(event.data);
        if (data.t) {
            if (data.t === "move") {
                //console.log(data);
                setCurrentFEN(data.d.fen + " w KQkq - 1 1");
                let pct = playingBlack ? data.d.clock.black/data.d.clock.white : data.d.clock.white/data.d.clock.black;
                setPlayTime(pct, playingBlack ? data.d.clock.black : data.d.clock.white);
                updateGameStatus(blackPlayer + " " + data.d.clock.black , whitePlayer + " " + data.d.clock.white);
            }
            else if (data.t === "end") {
                console.log("Game finished");
                gameSock.close(); //fen_loop = false;
            }
        }
    }

    gameSock.onerror = function(error) {
        console.log(`[error] ${error.message}`);
    };
}

function updateGameStatus(white,black) {
    document.getElementById("white_box").textContent = white;
    document.getElementById("black_box").textContent = black;
    //let status = document.getElementById("StatusBox");
    //status.textContent += msg + "\n";
    //status.scrollTop = status.scrollHeight;
}

function setPlayTime(pct, t) {
    timeFactor = pct;
    timeRemaining = t;
}

