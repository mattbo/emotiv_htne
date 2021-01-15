import React, {useState} from "react"
import { Link } from "gatsby"
import auth_img from "../../static/authorize.png"
import { Results } from "../components/results"

export default function Home() {

  const [results, setResults] = useState([]);
  let socket;
  let msg_id = 1;  // increment on each message
  const response_funcs = new Map(); // map message ID to callback

  function go(e) {
    e.preventDefault();
    // create socket
    socket = new WebSocket(process.env.SOCKET_URL);
    socket.onmessage = ((event) => {
        const msg = JSON.parse(event.data);
        const id = parseInt(msg.id);

        if (!response_funcs.has(id)) { 
            console.log("Got a bad message");
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
    setResults(prevResults => [...prevResults, 'starting send request']);
    socket.send(JSON.stringify(jsonRequest));
  }

  return (
      <div>
          <h2>Curious Hacker&apos;s Guide to Neuroscience</h2>
          <h3>Part 2: Building with the EMOTIV API </h3>
          <hr />
          <br />

          <p> Let&apos;s dive into using the Cortex API! </p>
          <p> The first thing to understand is that the API is based on
          websockets, and thus is asynchronous. Each API call will need to
          register a callback, which is a function that runs when the API
          responds.  </p>
          <p> The second thing to understand is that every app which uses the
          EMOTIV API must request authorization from the user, so that the black
          hats can&apos;t control our minds! (j/k, EMOTIV API does not allow for
          mind control.  Really.)</p>

          <p> The code below is just a copy/paste of the javascript in this file.  It makes presenting easier. </p>
          <pre><code>{`

  const [results, setResults] = useState([]);
  let socket;
  let msg_id = 1;  // increment on each message
  const response_funcs = new Map(); // map message ID to callback

  function go(e) {
    e.preventDefault();
    // create socket
    socket = new WebSocket(process.env.SOCKET_URL);
    socket.onmessage = ((event) => {
        const msg = JSON.parse(event.data);
        const id = parseInt(msg.id);

        if (!response_funcs.has(id)) { 
            console.log("Got a bad message");
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
    setResults(prevResults => [...prevResults, 'starting send request']);
    socket.send(JSON.stringify(jsonRequest));
  }

          `}</code></pre>
        
          <p><button onClick={go}>Go!</button> </p>
          <Results results={results} />

          <p> Nothing happened ?!? </p>

          <p> All new EMOTIV apps <b>MUST</b> be authorized by the user.  
          This is handled by the EmotivApp, which is available by clicking the brain logo in your menu bar (Mac) or system tray (Windows).  </p>

          <p>Here&apos;s what it looks like on my screen:<br />
          <img src={auth_img} alt="request for authorization in menu bar"
               width="40%"/></p>

          <p><Link to="/connect/"> Next step, connect </Link></p>
      </div>
  );
}
