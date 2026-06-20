import { createGlobalStyle, css } from "styled-components";

const globalStyles = css`
  :root {
    /* [COLORS]: backgrounds + surfaces */
    --color-background-shell: #333333; /* außerhalb App */
    --color-background-page: #1a1a1a;
    --color-surface-list-item: #323232;
    --color-surface-elevated: #232323;

    /* [COLORS]: text */
    --color-text-primary: #ffffff;
    --color-text-secondary: #cccccc;

    /* [COLORS]: buttons */
    --color-button-bg: #333333;
    --color-button-text: #cccccc;
    --color-button-active-bg: #e0e0e0;
    --color-button-active-text: #333333;

    --color-danger-surface: #ac2525;
    --color-danger-button-bg: #fa6c6c;
    --color-danger-button-text: #ffffffd5;

    /* [COLORS]: semantic */
    --color-income: #b4e5a2;
    --color-expense: #ff9393;

    /* [TYPOGRAPHY] */
    --font-size-base: 16px;
    --font-family-base: system-ui, sans-serif;

    /* [LAYOUT] */
    --app-max-width: 450px; /* max App-Fläche auf Desktop */
    --top-bar-height: 57px;
    --bottom-nav-height: 57px;

    /* [RADIUS] */
    --radius-sm: 10px; /* TooltipBox */
    --radius-md: 20px; /* buttons, inputs, TransactionList, CategoryLink */
    --radius-lg: 30px; /* Forms, Modals, Cards, FilterBar, DatePicker */
    --radius-full: 9999px; /* ColorTag */
    --radius-page: var(--radius-lg);
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html,
  body,
  #__next {
    height: 100%;
    width: 100%;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: var(--font-family-base);
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: var(--color-text-primary);
  }

  p {
    color: var(--color-text-secondary);
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

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  ul {
    list-style: none;
  }
`;

export default createGlobalStyle`
  ${globalStyles}
`;
