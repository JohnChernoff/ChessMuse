let current_game = new Chess();
let user_id, oauth, current_gid;
let streaming = false;
let play_stream = false;

function login() {
    if (!streaming) oauth=document.getElementById("input_oauth").value; else {
        toggleStream(false); return;
    }
    $.ajax({
        url: 'https://lichess.org/api/account',
        type: 'GET',
        headers: {'Accept':'application/json','Authorization':'Bearer ' + oauth},
        error: function(oops) { updateStatus(oops.responseText); console.log(oops); },
        success: function(a) { } //console.log("success: " + a);
    }).done(function(response) {
        user_id = response.id;
        updateStatus("Logged in as: " + user_id);
        toggleStream(true);
        streamEvents();
    });
}

function toggleStream(bool) {
    if (bool === undefined) bool = !streaming;
    let e = document.getElementById("log_butt");
    streaming = bool;
    if (streaming) e.innerText = "Logout"; else e.innerText = "Login";
}

function streamEvents() {
    fetch('https://lichess.org/api/stream/event',
        {headers:{'Accept':'application/x-ndjson','Authorization':'Bearer ' + oauth}}).
    then(readStream(processEvent)).then(onEventStreamClose);
}

function streamGame() {
    fetch('https://lichess.org/api/board/game/stream/' + current_gid,
        {headers:{'Accept':'application/x-ndjson','Authorization':'Bearer ' + oauth}}).
    then(readStream(processGameUpdate)).then(onGameStreamClose);
}

function togglePlayStream(e) {
    play_stream = !play_stream;
    if (play_stream) { e.innerText = " Stop Lichess "; playStream(); } else  e.innerText = " Play Lichess ";
}

//my function readStream takes a function as argument, and returns a function that takes a response as argument and returns a Promise
const readStream = processLine => response => {
    const stream = response.body.getReader();
    const matcher = /\r?\n/;
    const decoder = new TextDecoder();
    let buf = '';

    const loop = () =>
        stream.read().then(({ done, value }) => {
            if (!streaming || done) {
                if (buf.length > 0) processLine(JSON.parse(buf));
            } else {
                const chunk = decoder.decode(value, {
                    stream: true
                });
                buf += chunk;

                const parts = buf.split(matcher);
                buf = parts.pop();
                for (const i of parts) { //console.log(i);
                    if (i) processLine(JSON.parse(i));
                }
                return loop();
            }
        });

    return loop().then(() => { }); //console.log('the stream has completed');
}

function processGameUpdate(game_update) { //console.log(game_update);
    let data = game_update.state ? game_update.state.moves : game_update.moves;
    if (data) {
        current_game.reset();
        let move_list = data.split(" "); //console.log(move_list);
        for (let i = 0; i< move_list.length; i++) current_game.move(
            {from: move_list[i].substr(0,2), to: move_list[i].substr(2,2) }
        );
        console.log(current_game.ascii());
        updateFEN(current_game.fen());
    }
}

function playStream() {
    if (play_stream) {
        let melody = getMelody(current_game.history({ verbose: true }));
        let t = playMelody(melody,2,8);
        if (melody.length > 4) {
            let chord = melody.slice(melody.length-4); playChord(chord,2); //console.log(chord);
        }
        window.setTimeout(playStream,t * 1000);
    }
}

function processEvent(event) { //console.log(event);
    if (event.type === "gameStart") {
        current_gid = event.game.id; updateStatus("Beginning/resuming Game: " + current_gid);
        streamGame(); //console.log("Following game: " + current_gid);
    }
}

function onGameStreamClose() {
    if (streaming) updateStatus("Finished Game: " + current_gid); console.log("Game Stream closed.");
    current_game.reset();
}

function onEventStreamClose() {
    updateStatus("Logout: " + user_id); console.log("Event Stream closed.");
    toggleStream(false);
}
