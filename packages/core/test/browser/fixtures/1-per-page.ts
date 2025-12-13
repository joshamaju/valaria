import { html } from "./utils";

export default html`
  <html>
    <head>
      <style>
        body {
          margin: 0;
        }

        ul {
          margin: 0;
          padding: 0;
          width: 10rem;
          height: 7rem;
          display: flex;
          list-style: none;
          overflow-x: auto;
        }

        ul > * + * {
          margin-inline-start: 1rem;
        }

        ul li {
          height: 100%;
          flex: 0 0 100%;
          background: red;
        }
      </style>
    </head>
    <body>
      <ul data-testid="list">
        <li data-testid="list-item">1</li>
        <li data-testid="list-item">2</li>
        <li data-testid="list-item">3</li>
        <li data-testid="list-item">4</li>
        <li data-testid="list-item">5</li>
        <li data-testid="list-item">6</li>
      </ul>
    </body>
  </html>
`;
