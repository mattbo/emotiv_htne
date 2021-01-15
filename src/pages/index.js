import React from "react"
import { Link } from "gatsby"

export default function Home() {
  return (
    <div>
    <h2>Welcome to the Curious Hacker&apos;s Guide to Neuroscience</h2>
    <h3>Part 2: Building with the EMOTIV API </h3>
    <hr />
    <br />

    <p> In this workshop we&apos;re going to build a (relatively) simple app with the Emotiv API (aka Cortex).  The app will be built with <a href="https://www.gatsbyjs.com">Gatsby</a>, <a href="https://www.reactjs.org">React</a>,  and the builtin javascript WebSockets client. </p>

    <p> Before you can start, you will need to set up Cortex:

    <ul>
      <li>
        First, to create an EMOTIV ID, go to
        <a href="https://www.emotiv.com">emotiv.com</a>, click
        <code>Login</code>, click <code>Register</code> and fill out the
        necessary form.
      </li> <li>
        Next, apply for the BCI API 
        <a href="https://www.emotiv.com/bci-api-application-form/"> here </a>
      </li> <li>
        Then, download the
        <a href="https://www.emotiv.com/my-account/downloads/"> Emotiv
          Installer</a>
      </li> <li>
        Create an application key by following &nbsp;
        <a href="https://emotiv.gitbook.io/cortex-api/#create-a-cortex-app">
          these instructions</a>
      </li> <li>
         Finally, be sure to update
            <code>{`./.env.development`}</code> with your client ID and client
          secret from the EMOTIV developer page.
      </li>
    </ul>  </p>

    <p> Here are some handy references for later
    <ul>
      <li> <a href="https://emotiv.gitbook.io/cortex-api/"> Cortex docs </a>
      </li><li> <a href="https://github.com/Emotiv/cortex-v2-example.git">
        EMOTIV Cortex sample repo </a> </li>
    </ul> </p>

    <p>
      <Link to="/authorize/"> Next, let&apos;s get authorized </Link>
    </p>

    </div>
  );
}
