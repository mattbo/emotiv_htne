import React, { useState } from "react"
import { Link } from "gatsby"
import { Results } from "../components/results"

export default function Home() {

  const [results, setResults] = useState([]);
  let socket;
  let msg_id = 1;  // increment on each message
  const response_funcs = new Map(); // map message ID to callback
  const data_obj = {};  // NEW store our global data

  function go(e) {
    e.preventDefault();
    // create socket
    socket = new WebSocket(process.env.SOCKET_URL);
    socket.onmessage = ((event) => {
        const msg = JSON.parse(event.data);
        const id = parseInt(msg.id);

        if (!response_funcs.has(id)) { 
            console.log("Got a bad message??");
            console.log(event.data);
            setResults(prevResults => [...prevResults, "Got a bad message??"]);
            return
        }
        response_funcs.get(id)(msg); // send the data to the callback
    });
    socket.onerror = (() => {
        alert("Web socket got an error?!?");
    });
    socket.onopen = (() => {
        requestAccess();
    });

  }

  function requestAccess(){
    console.log("requesting access (id:" + msg_id + ")");
    setResults(prevResults => [...prevResults,
        "requesting access (id:" + msg_id + ")"]);

    // set up the response callback
    response_funcs.set(msg_id, (data) => {
        console.log("Got requestAccess response!");
        console.log(data);
        setResults(prevResults => [...prevResults,
            "Got requestAccess response!"]);
        queryHeadsets();  // NEW!!
    });

    // JSON data to send
    let jsonRequest = {
          "jsonrpc": "2.0", 
          "method": "requestAccess", 
          "params": { 
              "clientId": process.env.CLIENT_ID, 
              "clientSecret": process.env.CLIENT_SECRET
          },
          "id": msg_id
    };

    msg_id += 1;

    console.log('starting send request');
    console.log(jsonRequest)
    socket.send(JSON.stringify(jsonRequest));
  }

  function queryHeadsets(){  // !! NEW !!
      // set up the response callback
      response_funcs.set(msg_id, (msg) => {
          console.log("Got headset list, picking the first one");
          console.log(msg);
          if(msg['result'].length > 0){
              data_obj['headsetId'] = msg['result'][0]['id']
              setResults(prevResults => [...prevResults,
                "Connected to headset: " + data_obj['headsetId']]);
          } else {
              console.log('No headset found, ' + 
                          'please connect headset with your pc.')
          }
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "queryHeadsets",
          "params": {}
      };
      msg_id += 1;
                         
      socket.send(JSON.stringify(jsonRequest));
    }


  return (
      <div>
          <h2>Curious Hacker&apos;s Guide to Neuroscience</h2>
          <h3>Part 2: Building with the EMOTIV API </h3>
          <hr />
          <br />

          <p> Now that we have succeeded in authorizing our new app, it&apos;s
          time to connect to a headset </p>

          <pre><code>{`

  const [results, setResults] = useState([]);
  let socket;
  let msg_id = 1;  // increment on each message
  const response_funcs = new Map(); // map message ID to callback
  const data_obj = {};  // NEW store our global data

  function go(e) {
    // no changes here...
  }

  function requestAccess(){
    // this is mostly the same, except the callback... 

    // set up the response callback
    response_funcs.set(msg_id, (data) => {
        console.log("Got requestAccess response!");
        console.log(data);
        setResults(prevResults => [...prevResults,
            "Got requestAccess response!"]);
        queryHeadsets();  // NEW!!
    });

  }

  function queryHeadsets(){  // !! NEW !!
      // set up the response callback
      response_funcs.set(msg_id, (msg) => {
          console.log("Got headset list, picking the first one");
          console.log(msg);
          if(msg['result'].length > 0){
              data_obj['headsetId'] = msg['result'][0]['id']
              setResults(prevResults => [...prevResults,
                "Connected to headset: " + data_obj['headsetId']]);
          } else {
              console.log('No headset found, ' + 
                          'please connect headset with your pc.')
          }
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "queryHeadsets",
          "params": {}
      };
      msg_id += 1;
                         
      socket.send(JSON.stringify(jsonRequest));
    }

          `}</code></pre>
        
          <p><button onClick={go}>Go!</button> </p>
          <Results results={results} />


          <p> Nothing happened ?!? </p>

          <p> That is most likely because you don&apos;t have a headset! </p>

          <p> Never fear, we have a solution: Virtual Brainware </p>

          <p> Bring up the EmotivApp, click the Devices tab, and at the bottom
          select 'Add a Virtual Brainware&reg; device'.</p>

          <p> You can select any headset you&apos;d like, but I recommend either
    the Insight, or the EPOC for today&apos;s workshop.  Leave the other
    settings at the defaults. </p>


          <p> Now, click the Try It button above and it should work... </p>

          <p><Link to="/subscribe/"> Finally, get some data </Link></p>
      </div>
  );
}
