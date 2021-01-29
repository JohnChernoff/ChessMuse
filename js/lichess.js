let current_game = new Chess();
let user_id = null;
let current_gid = null;
let lichSock = null;
let queue = [];
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
        followLichessHandle();
    }
    else {
        button.innerText = "Watch"; //TODO: unfollow
    }
}

function followLichessHandle() {
    if (!lichess) return;
    user_id = document.getElementById("input_user_id").value;
    if (current_gid === null && user_id !== "") {
        console.log("Fetching User: " + user_id);
        fetch("https://lichess.org/api/users/status?ids=" + user_id,
            {headers:{'Accept':'application/json'}})
            .then(response => response.text())
            .then(text => JSON.parse(text))
            .then(json => { //console.log(json);
                if (json[0].playing) getGID();
            });
    }
    if (lichess) setTimeout(followLichessHandle,5000);
}

function getGID() {
    fetch("https://lichess.org/api/user/" + user_id,{headers:{'Accept':'application/json'}})
         .then(response => response.text())
         .then(text => JSON.parse(text))
         .then(json => followGame(getGIDFromURL(json.playing))); //initLichessSocket(getGIDFromURL(json.playing)));
}

function getGIDFromURL(url) {
    console.log(url);
    if (url === "undefined") return null;
    let bits = url.split("/");
    playingBlack = bits[bits.length-1].toLowerCase() === "black";
    return bits[bits.length-2];
}

function followGame(gid) {
    if (gid == null) return; current_gid = gid;
    current_game.reset(); console.log("Beginning/resuming Game: " + current_gid);

    fetch("https://lichess.org/api/user/" + user_id + "/current-game",
        {headers:{'Accept':'application/json'}})
        .then(response => response.text())
        .then(txt => JSON.parse(txt))
        .then(json => setPlayers(json));

    let message = JSON.stringify({ t: 'startWatching', d: current_gid });
    send(lichSock, message);
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

function send(sock, message) {
    if (sock.readyState === 1) sock.send(message); else queue.push(message);
}

function runLichessSocket() {
    const baseURL = 'wss://socket.lichess.org';
    const endpoint = '/api/socket';
    const url = baseURL + endpoint;
    lichSock = new WebSocket(url);

    lichSock.onopen = function () {
        console.log("Connected to Lichess...");
        while (queue.length > 0) {
            let message = queue.pop();
            lichSock.send(message);
        }
    }

    lichSock.onerror = function (error) { console.error(error); }

    lichSock.onmessage = function (e) { //console.log(("Message: ") + e.data);
        let data = JSON.parse(e.data);
        if (data.t) {
            if (data.t === "fen") {
                //console.log(data);
                setCurrentFEN(data.d.fen + " w KQkq - 1 1");
                let pct = playingBlack ? data.d.bc/data.d.wc : data.d.wc/data.d.bc;
                setPlayTime(pct, playingBlack ? data.d.bc : data.d.wc);
                updateGameStatus(blackPlayer + " " + data.d.bc , whitePlayer + " " + data.d.wc);
            }
            else if (data.t === "finish") {
                console.log("Game finished");
                current_gid = null;
            }
        }
    }

    lichSock.onclose = function () {
        //runLichessSocket(); followGame(current_gid);
    }
}

function lichessLogin() {
    window.location = "http://localhost:8087";
    /* fetch("http://localhost:8087/auth",
        {
            //mode: 'cors',
            headers:{'Accept':'application/json'} //, 'Access-Control-Allow-Origin':'*'}
        })
        .then(response => response.json())
        .then(txt => console.log(txt)); */
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

runLichessSocket();

