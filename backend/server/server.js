import fetch from "node-fetch";
import pkg from 'unique-names-generator';
import { WebSocketServer, WebSocket } from 'ws';
const { uniqueNamesGenerator, Config, adjectives, colors, animals } = pkg;
import { STABLE_DIFFUSION_URL, WIKIPEDIA_SERVER_URL } from './constants.js';

const PORT = 8080;


// sourcePainting is {width, height, painting_name(reveal at the end)}
var sourcePainting = { "image_width": 512, "image_height": 512 }
var sourcePaintingBytes

// generatedPaintings is an map of {id, likes, username}
var generatedPaintings = {}

var users = []

const usernameGeneratorConfig = {
  dictionaries: [adjectives, colors, animals],
  length: 2,
  style: 'capital',
  separator: ''
}

function compare(a, b) {
  if (a.likes < b.likes) {
    return -1;
  }
  if (a.likes > b.likes) {
    return 1;
  }
  return 0;
}

const wss = new WebSocketServer({ port: PORT });
console.log(`Starting websocket server at port ${PORT}...`)

function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  })
}

wss.on('error', (error) => {
  console.log("ERROR: ", error)
})

wss.on('connection', function connection(ws) {
  ws.on('message', function message(raw_data) {
    const data = JSON.parse(raw_data)
    console.log('received message:', data);
    switch (data.event_type) {
      // A new user connects
      case "USER_CONNECT":
        const username = uniqueNamesGenerator(usernameGeneratorConfig)
        console.log(`Got new username ${username}`);
        // Notify everyone of the new user
        broadcast(JSON.stringify({
          event_type: "OTHER_USER_CONNECT",
          message: {
            sender: "Server",
            data: `${username} has joined the game.\n`
          }
        }));
        ws.send(JSON.stringify({
          "event_type": "USER_CONNECT",
          "message": {
            "sender": "Server",
            "data": ""
          },
          "data": {
            username: username,
            isForager: getRandomInt(2) == 0
        }))

        users.push(username)
        break;
      case "SEND_CHAT_MESSAGE":
        broadcast(JSON.stringify({
          event_type: "RECEIVE_CHAT_MESSAGE",
          message: {
            sender: data.message.sender,
            data: data.message.data
          }
        }));
        break;

      // User requests to run Stable Diffusion
      case "SEND_PROMPT_REQUEST":
        // Send a request to Stable Diffusion
        console.log("SOURCE PAINTING IS", sourcePainting)
        const result = fetch(STABLE_DIFFUSION_URL, {
          'method': "post",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          'body': JSON.stringify({
            prompt: data.message.data,
            n_iterations: 20,
            // source_width: sourcePainting['image_width'],
            // source_height: sourcePainting['image_height'],
            source_width: 512,
            source_height: 512,
          })
        }).then((response) => response.json())
          .then((res) => {
            // Add the username to the result
            res['sender'] = data.message.sender
            res['likes'] = 0
            broadcast(JSON.stringify({
              "event_type": "RECEIVE_GENERATION_RESULT",
              message: {
                data: `${data.message.sender} created a forgery.`,
                sender: "Server"
              },
              data: res
            }))

            // Save painting metadata
            generatedPaintings[res['id']] = {
              "username": data.message.sender,
              "likes": 0,
              "image_bytes": res['image_bytes']
            }
          })
        break;
      // Fetch a random painting 
      case 'GET_WIKIPEDIA':
        const wiki_result = fetch(WIKIPEDIA_SERVER_URL, {
          'method': "post",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          'body': JSON.stringify({})
        }).then((response) => response.json())
          .then((res) => {
            // Add the username to the result
            res['sender'] = data.message.sender
            broadcast(JSON.stringify({
              "event_type": "RECEIVE_WIKIPEDIA_RESULT",
              message: {
                data: `Selected a painting for the round.`,
                sender: "Server"
              },
              data: res
            }))
            sourcePainting = {
              'image_width': res['image_width'],
              'image_height': res['image_height'],
              'title': res['title'],
              'image_bytes': res['image_b64_str']
            }
          })
        break;

      case 'SEND_LIKE_FORGERY':
        const like_forgery_id = data.data['forgery_id']

        if (!(like_forgery_id in generatedPaintings)) {
          return
        }
        // Get the painting like_forgery_id = data.data['forgery_id']
        generatedPaintings[like_forgery_id]['likes'] = generatedPaintings[like_forgery_id]['likes'] + 1
        console.log(generatedPaintings)
        broadcast(JSON.stringify({
          "event_type": "RECEIVE_LIKE",
          "data": {
            "forgery_id": like_forgery_id,
            "likes": generatedPaintings[like_forgery_id]['likes']
          },
          "message": {
            'data': "",
            'sender': "Server"
          }
        }))
        break;
      case 'SEND_UNLIKE_FORGERY':
        // Get the
        const unlike_forgery_id = data.data['forgery_id']
        if (!(unlike_forgery_id in generatedPaintings)) {
          return
        }
        generatedPaintings[unlike_forgery_id]['likes'] = generatedPaintings[unlike_forgery_id]['likes'] - 1
        broadcast(JSON.stringify({
          "event_type": "RECEIVE_LIKE",
          "data": {
            "forgery_id": unlike_forgery_id,
            "likes": generatedPaintings[unlike_forgery_id]['likes']
          },
          "message": {
            'data': "",
            'sender': "Server"
          }
        }))
        console.log(generatedPaintings)
        break;

      // Forger requests to pass turn
      case 'SEND_FORGERS_FINISHED':
        // sort the paintings by likes
        let array = []
        for (const [key, value] of Object.entries(generatedPaintings)) {
          let x = value;
          x['id'] = key
          array.push(x)
        }


        array.sort(function (a, b) {
          var x = a.likes < b.likes ? 1 : -1;
          return x;
        });

        const num_best = 3;

        var best_paintings = [];

        for (var i = 0; i < num_best; i++) {
          if (i >= array.length) {
            break;
          }
          best_paintings.push(array[i]);
        }

        best_paintings.push({
          id: "0",
          image_bytes: sourcePainting.image_bytes
        })


        broadcast(JSON.stringify({
          event_type: "RECEIVE_FORGERS_FINISHED",
          "data": {
            best_paintings: best_paintings
          },
          message: {
            data: "Forgers are finished!",
            sender: "Server"
          }
        }))

        break;

      case 'SEND_DETECTIVES_FINISHED':
        // Check the guess 
        let forgery_id = data.data.forgery_id;
        let res = {};
        if (forgery_id == 0) {
          res = {
            event_type: "RECEIVE_DETECTIVES_FINISHED",
            data: {
              winner: "Detectives"
            },
            message: {
              data: "Detectives found the true painting and win!",
              sender: "Server"
            }
          }
        } else {
          res = {
            event_type: "RECEIVE_DETECTIVES_FINISHED",
            data: {
              winner: "Forgers"
            },
            message: {
              data: "Forgers successfully fooled the detectives and win!",
              sender: "Server"
            }
          }
        }
        broadcast(JSON.stringify(res));
    }

  })
});;