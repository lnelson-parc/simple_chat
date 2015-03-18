var http = require("http");
var ws = require("../../");
var fs = require("fs");
//var persist = require("pst_obj")
var state = { chatId : ''};


// api/layer to interface with state object
function setChatId(chatId) {
    state.chatId = chatId;
    //state.persist();
    return state.chatId;
}

// initialize state object
//persist.get('state.json', state, function(data, err) {
//    state = data;
//    console.log('Stored state ' + (err ? 'created' : 'fetched') + ', chatId: ' + state.chatId);
//});

http.createServer(function (req, res) {
	fs.createReadStream("index.html").pipe(res);
}).listen(8080)

function parse_json_text(text) {
    try {
        var parsed_json = {};
        console.log("Processing Incoming Message: " + text);
        msg = JSON.parse(text, function (k, v) {
            console.log("  Handshake: " + k + ":" + v);
            if (k === '') {
                return v;
            }
            parsed_json[k] = v
            return v;
        })
        if (!('type' in parsed_json)) {
            parsed_json['type'] = "JSON";
        }
        return parsed_json;
    }
    catch (err) {
        console.log("  Parse error: " +err.message)
        return {type:"TEXT", text:text };
    }
}

function format_reply_message(msg_type, msg_status, msg_body, msg_chatId) {
    var mgs_format = {
        type: msg_type,
        status: msg_status,
        body: msg_body,
        chatId: msg_chatId
    };
    return JSON.stringify(mgs_format);
}

var credentials = null

function generateUUID(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

var server = ws.createServer(function (connection) {
    //connection.credentials = null
    connection.on("text", function (str) {
        var chat_message = parse_json_text(str);
        console.log("  Message data received: " + str + "\n" + JSON.stringify(chat_message))
        if ("type" in chat_message) {
            if (chat_message.type == "HANDSHAKE") {
                //connection.credentials = parse_handshake(str)
                // Send reply to the agent client on handshake messages
                //var chat_credentials = parse_handshake(str);
                console.log("  Handshake data passed: " + chat_message.chatId)
                //broadcast(format_reply_message("HANDSHAKE", "OK", "", setChatId(chat_message.chatId)))
                broadcast(format_reply_message("HANDSHAKE", "OK", "An Agent has joined the chat", setChatId("User-"+generateUUID())))
            } else if (chat_message.type == "TEXT" || chat_message.type == "DATA" ) {
                // Echo text messages to all chat clients, but tell agent client to ignore user messages
                var reply_type = "DATA";
                var broadcast_text = "";
                if (chat_message.type == "DATA" && "body" in chat_message) {
                    reply_type = "AGENT_IGNORE";
                    broadcast_text = chat_message.body;
                } else if ("text" in chat_message) {
                    broadcast_text = chat_message.text;
                }
                console.log("  Message data passed: " + broadcast_text);
                broadcast(format_reply_message(reply_type, "OK", broadcast_text, state.chatId))
                if (state.chatId == "") {
                    broadcast(format_reply_message("AGENT_IGNORE", "OK", "There is no Agent currently available. Please try again later.", state.chatId))

                }
            } else if (chat_message.type == "CLOSING" ) {
                // Echo text messages to all chat clients, but tell agent client to ignore user messages
                var reply_type = "AGENT_IGNORE";
                var broadcast_text = "The Agent has left the chat";
                console.log("  Message for closing passed: " + broadcast_text);
                broadcast(format_reply_message(reply_type, "OK", broadcast_text, setChatId("")));
            }
        }
    });

    connection.on("close", function () {
        //broadcast(connection.nickname + " left")
    });
});

server.listen(8081);

function broadcast(str) {
	server.connections.forEach(function (connection) {
        console.log("Server Broadcasting:\n" + str);
		connection.sendText(str);
	})
}
