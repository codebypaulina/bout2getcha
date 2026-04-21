import { createGlobalStyle } from "styled-components";

export default createGlobalStyle`
  :root {
    /* [COLORS]: surfaces + text */
    --background-color: #1a1a1a;
    --desktop-shell-background-color: #333333; /* außerhalb App */
    --list-item-background: #323232;

    --primary-text-color: #ffffff;
    --secondary-text-color: #cccccc;

    /* [COLORS]: buttons */
    --button-background-color: #333333;
    --button-text-color: #cccccc;
    --button-active-text-color: #333333;
    --button-active-color: #e0e0e0;
    --button-hover-color: #444444;

    /* [COLORS]: semantic */
    --income-color: #b4e5a2;
    --expense-color: #ff9393;

    /* [TYPOGRAPHY] */
    --base-font-size: 16px;
    --font-family-base: system-ui, sans-serif;

    /* [LAYOUT] */
    --app-max-width: 450px; /* max App-Fläche auf Desktop */
    --topbar-height: 57px;
    --bottomnav-height: 57px;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body, #__next {
    height: 100%;
    width: 100%;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: var(--font-family-base);
    font-size: var(--base-font-size);
    color: var(--secondary-text-color);
  }

  h1, h2, h3, h4, h5, h6 {
    color: var(--primary-text-color);
  }

  p {
    color: var(--secondary-text-color);
    font-size: 0.875rem;
  }

  h1 {
    font-size: 1.85rem;
  }

  h2 {
    font-size: 1.25rem;
  }

  h3 {
    font-size: 1.125rem;
  }

  button, input, textarea, select {
    font: inherit;
  }

  ul {
    list-style: none;
  }
`;
