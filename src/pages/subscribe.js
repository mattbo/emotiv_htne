import React, {useState} from "react"
import { ResultsTable } from "../components/results"

export default function Home() {

  const [resultData, setResultData] = useState([]);
  let socket;
  let msg_id = 1;  // increment on each message
  const MAX_DATA_VALS = 100;
  const response_funcs = new Map(); // map message ID to callback
  const data_obj = {};  // store our global data

  function go(e) {
    e.preventDefault();
    // create socket
    socket = new WebSocket(process.env.SOCKET_URL);
    socket.onmessage = ((event) => {
        const msg = JSON.parse(event.data);
        const id = parseInt(msg.id);

        // !! NEW !!
        if (msg.warning) {
            // Warnings can come for many reasons, here we are dealing 
            // with headset connections
            data_obj['warning'] = msg.warning;
            return;
        }

        // !! NEW !!
        if(msg.sid && response_funcs.has(msg.sid)) {
            // handle subscription data...
            response_funcs.get(msg.sid)(msg);
            return
        }

        if (!response_funcs.has(id)) { 
            console.log("Got a bad message??");
            console.log(event.data);
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
    // set up the response callback
    response_funcs.set(msg_id, (data) => {
        console.log("Got connect response!");
        console.log(data);
        queryHeadsets();
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

  function queryHeadsets(){
      // set up the response callback
      response_funcs.set(msg_id, (msg) => {
          console.log("Got headset list, picking the first one");
          console.log(msg);
          if(msg['result'].length > 0){
              data_obj['headsetId'] = msg['result'][0]['id']
              controlDevice(); // next step in the process
          } else {
              console.log('No headset found, ' + 
                          'please connect headset with your pc.')
          }
      });

      // JSON data to send
      let queryHeadsetRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "queryHeadsets",
          "params": {}
      };
      msg_id += 1;
                         
      socket.send(JSON.stringify(queryHeadsetRequest));
  }

  // !! NEW !!
  function controlDevice() {
      // set up the response callback
      response_funcs.set(msg_id, (msg) => {
          console.log("Got controlDevice response");
          console.log(msg);
          // This response is a throwaway.  Have to loop on queryHeadsets
          // until we see status == connected
          checkConnection();
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "controlDevice",
          "params": {
              "command": "connect",
              "headset": data_obj['headsetId']
          }
      };
      msg_id += 1;
                         
      socket.send(JSON.stringify(jsonRequest));
  }

  // !! NEW !!
  function checkConnection() { 
      // this spins until we either get a warning that something went 
      // wrong, or connection success.

      response_funcs.set(msg_id, (msg) => {
          console.log("Got checkConnection response");
          console.log(msg);
          msg.result.forEach((headset) => {
              console.log("checking headset for " + data_obj.headsetId);
              console.log(headset);

              if (headset.id === data_obj.headsetId) {
                  console.log("Found headset by ID");
                  if (headset.status === "connected") {
                      // we're good! get a token
                      authorize();
                  } else {
                      console.log("Headset not connected yet, retrying...");
                      window.setTimeout(checkConnection, 2000);
                  }
              }
          });
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "queryHeadsets"
      };
      msg_id += 1;
                         
      socket.send(JSON.stringify(jsonRequest));
  }

  // !! NEW !!
  function authorize() { 
      console.log("Connected to headset: " + data_obj['headsetId']);

      response_funcs.set(msg_id, (msg) => {
          console.log("Got authorize response");
          console.log(msg);
          data_obj['token'] = msg.result.cortexToken
          // deal with EULA?
          openSession();
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "authorize",
          "params": {
              "clientId": process.env.CLIENT_ID,
              "clientSecret": process.env.CLIENT_SECRET
          }
      };
      msg_id += 1;
                         
      socket.send(JSON.stringify(jsonRequest));
  }


  // !! NEW !!
  function openSession() {
      console.log("Authorized, opening session");

      response_funcs.set(msg_id, (msg) => {
          console.log("Opened session");
          console.log(msg);
          data_obj['session_id'] = msg.result.id
          subscribe();
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "createSession",
          "params": {
              "cortexToken": data_obj['token'],
              "headset": data_obj['headsetId'],
              "status": "open"  // "activate" is useful for paid licenses
          }
      };
      msg_id += 1;
                         
      console.log(jsonRequest);
      socket.send(JSON.stringify(jsonRequest));
  }

  // !! NEW !!
  function subscribe() {
      console.log("Subscribing to data");

      response_funcs.set(msg_id, (msg) => {
          data_obj['data_cnt'] = MAX_DATA_VALS;  // unsubscribe after some data

          // subscription success response includes the column names
          // in the same order as the results will appear.
          data_obj['results_cols'] = msg.result.success[0].cols;
          response_funcs.set(msg.result.success[0].sid, (data) => {
              // update the data in react state to re-render results table
              setResultData(data.pow.map((cur_val, idx) => (
                    {channel: data_obj['results_cols'][idx], value: cur_val}
              )));

              // countdown until unsubscribe
              data_obj['data_cnt'] -= 1;
              if (data_obj['data_cnt'] <= 0) {
                  unsubscribe();
              }
          });
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "subscribe",
          "params": {
              "cortexToken": data_obj['token'],
              "session": data_obj['session_id'],
              "streams": ["pow"]
          }
      };
      msg_id += 1;
                         
      console.log(jsonRequest);
      socket.send(JSON.stringify(jsonRequest));
  }

  // !! NEW !!
  function unsubscribe() {
      console.log("unsubscribing to data");

      response_funcs.set(msg_id, (msg) => {
          console.log("Done");
          console.log(msg);
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "unsubscribe",
          "params": {
              "cortexToken": data_obj['token'],
              "session": data_obj['session_id'],
              "streams": ["pow"]
          }
      };
      msg_id += 1;
                         
      console.log(jsonRequest);
      socket.send(JSON.stringify(jsonRequest));
  }

  return (
      <div>
          <h2>Curious Hacker&apos;s Guide to Neuroscience</h2>
          <h3>Part 2: Building with the EMOTIV API </h3>
          <hr />
          <br />
          <p> At this point we have authorized, we have connected a headset, and
          now it is time to get some data! </p>
          <p> This page has significantly more code than the previous two, but
          the structure remains the same: create and register a callback, then
          call an API endpoint.  In this case, the endpoints are:  </p>
          <ul>
            <li> <code> requestAccess</code> to make sure our app is authorized
          </li>
            <li> <code> queryHeadsets</code> to list the available headsets
          </li>
            <li> <code> controlDevice</code> to connect to a headset </li>
            <li> <code> checkConnection</code> to busy wait until the headset is
          connected </li>
            <li> <code> authorize</code> to make sure that the user is
          authorized to use our app </li>
            <li> <code> openSession</code> to tell the headset to start
          recording data </li>
            <li> <code> subscribe</code> to start getting data from the headset
          </li>
            <li> <code> unsubscribe</code> to stop getting data from the headset
          </li>
          </ul>

          <p> We are also going to look at handling streaming data, which
          requires a different kind of callback. </p>

          <pre><code>{`
  const [resultData, setResultData] = useState([]);
  let socket;
  let msg_id = 1;  // increment on each message
  const response_funcs = new Map(); // map message ID to callback
  const MAX_DATA_VALS = 100;
  const data_obj = {};  // store our global data

  function go(e) {
    e.preventDefault();
    // create socket
    socket = new WebSocket(process.env.SOCKET_URL);
    socket.onmessage = ((event) => {
        const msg = JSON.parse(event.data);
        const id = parseInt(msg.id);

        // !! NEW !!
        if (msg.warning) {
            // Warnings can come for many reasons, here we are dealing 
            // with headset connections
            data_obj['warning'] = msg.warning;
            return;
        }

        // !! NEW !!
        if(msg.sid && response_funcs.has(msg.sid)) {
            // handle subscription data...
            response_funcs.get(msg.sid)(msg);
            return
        }

        if (!response_funcs.has(id)) { 
            console.log("Got a bad message??");
            console.log(event.data);
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
    // unchanged -- requestAccess, then queryHeadsets()
  }

  function queryHeadsets(){
      // set up the response callback
      response_funcs.set(msg_id, (msg) => {
          console.log("Got headset list, picking the first one");
          console.log(msg);
          if(msg['result'].length > 0){
              data_obj['headsetId'] = msg['result'][0]['id']
              controlDevice(); // !! NEW !!
          } else {
              console.log('No headset found, ' + 
                          'please connect headset with your pc.')
          }
      });

      // The rest of this function is unchanged...
  }

  // !! NEW !!
  function controlDevice() {
      // set up the response callback
      response_funcs.set(msg_id, (msg) => {
          console.log("Got controlDevice response");
          console.log(msg);
          // This response is a throwaway.  Have to loop on queryHeadsets
          // until we see status == connected
          checkConnection();
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "controlDevice",
          "params": {
              "command": "connect",
              "headset": data_obj['headsetId']
          }
      };
      msg_id += 1;
                         
      socket.send(JSON.stringify(jsonRequest));
  }

  // !! NEW !!
  function checkConnection() { 
      // this spins until we either get a warning that something went 
      // wrong, or connection success.

      response_funcs.set(msg_id, (msg) => {
          console.log("Got checkConnection response");
          console.log(msg);
          msg.result.forEach((headset) => {
              console.log("checking headset for " + data_obj.headsetId);
              console.log(headset);

              if (headset.id === data_obj.headsetId) {
                  console.log("Found headset by ID");
                  if (headset.status === "connected") {
                      // we're good! get a token
                      authorize();
                  } else {
                      console.log("Headset not connected yet, retrying...");
                      window.setTimeout(checkConnection, 2000);
                  }
              }
          });
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "queryHeadsets"
      };
      msg_id += 1;
                         
      socket.send(JSON.stringify(jsonRequest));
  }

  // !! NEW !!
  function authorize() { 
      console.log("Connected to headset: " + data_obj['headsetId']);

      response_funcs.set(msg_id, (msg) => {
          console.log("Got authorize response");
          console.log(msg);
          data_obj['token'] = msg.result.cortexToken
          // deal with EULA?
          openSession();
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "authorize",
          "params": {
              "clientId": process.env.CLIENT_ID,
              "clientSecret": process.env.CLIENT_SECRET
          }
      };
      msg_id += 1;
                         
      socket.send(JSON.stringify(jsonRequest));
  }


  // !! NEW !!
  function openSession() {
      console.log("Authorized, opening session");

      response_funcs.set(msg_id, (msg) => {
          console.log("Opened session");
          console.log(msg);
          data_obj['session_id'] = msg.result.id
          subscribe();
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "createSession",
          "params": {
              "cortexToken": data_obj['token'],
              "headset": data_obj['headsetId'],
              "status": "open"  // "activate" is useful for paid licenses
          }
      };
      msg_id += 1;
                         
      console.log(jsonRequest);
      socket.send(JSON.stringify(jsonRequest));
  }

  // !! NEW !!
  function subscribe() {
      console.log("Subscribing to data");

      response_funcs.set(msg_id, (msg) => {
          data_obj['data_cnt'] = MAX_DATA_VALS;  // unsubscribe after some data

          // subscription success response includes the column names
          // in the same order as the results will appear.
          data_obj['results_cols'] = msg.result.success[0].cols;
          response_funcs.set(msg.result.success[0].sid, (data) => {
              // update the data in react state to re-render results table
              setResultData(data.pow.map((cur_val, idx) => (
                    {channel: data_obj['results_cols'][idx], value: cur_val}
              )));

              // countdown until unsubscribe
              data_obj['data_cnt'] -= 1;
              if (data_obj['data_cnt'] <= 0) {
                  unsubscribe();
              }
          });
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "subscribe",
          "params": {
              "cortexToken": data_obj['token'],
              "session": data_obj['session_id'],
              "streams": ["pow"]
          }
      };
      msg_id += 1;
                         
      console.log(jsonRequest);
      socket.send(JSON.stringify(jsonRequest));
  }

  // !! NEW !!
  function unsubscribe() {
      console.log("unsubscribing to data");

      response_funcs.set(msg_id, (msg) => {
          console.log("Done");
          console.log(msg);
      });

      // JSON data to send
      let jsonRequest =  {
          "jsonrpc": "2.0", 
          "id": msg_id,
          "method": "unsubscribe",
          "params": {
              "cortexToken": data_obj['token'],
              "session": data_obj['session_id'],
              "streams": ["pow"]
          }
      };
      msg_id += 1;
                         
      console.log(jsonRequest);
      socket.send(JSON.stringify(jsonRequest));
  }

          `}</code></pre>
        
          <p><button onClick={go}>Try it</button> </p>

          <p> Results: </p>
          <ResultsTable rows={resultData} />

      </div>
  );
}
