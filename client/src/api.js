
export function sendChatMessage(ws, chatMessage, username) {
    ws.send(JSON.stringify({
        "event_type": "SEND_CHAT_MESSAGE",
        "message": {
            "data": chatMessage,
            "sender": username
        }
    }))
}

export function sendPromptRequest(ws, prompt, username) {
    if (prompt == "") {
        return;
    }
    ws.send(JSON.stringify({
        "event_type": "SEND_PROMPT_REQUEST",
        "message": {
            "data": prompt,
            "sender": username
        }
    }))
}

export function sendGenerationRequest(ws, prompt, username) {
    ws.send(JSON.stringify({
        "event_type": "SEND_GENERATION_REQUEST",
        "message": {
            "data": prompt,
            "sender": username
        }
    }))
}

export function sendGetPaintingRequest(ws, username) {
          ws.send(JSON.stringify({
            "event_type": "GET_WIKIPEDIA",
            "message": {
              "data": "",
              "sender": username
            }
          }))
}

export function sendLikeForgery(ws, forgery_id, username) {
          ws.send(JSON.stringify({
            "event_type": "SEND_LIKE_FORGERY",
            "message": {
              "data": "",
              "sender": username
            },
            "data": {
                forgery_id: forgery_id,
                username: username,
            }
          }))
}

export function sendUnlikeForgery(ws, forgery_id, username) {
          ws.send(JSON.stringify({
            "event_type": "SEND_UNLIKE_FORGERY",
            "message": {
              "data": "",
              "sender": username
            },
            "data": {
                forgery_id: forgery_id,
                username: username,
            }
          }))
}