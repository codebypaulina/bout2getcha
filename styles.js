import { createGlobalStyle } from "styled-components";

export default createGlobalStyle`
  :root {
    --background-color: #1a1a1a;
    --primary-text-color: #ffffff;
    --secondary-text-color: #cccccc;

    --button-background-color: #333333; // nicht aktiv
    --button-text-color: #cccccc; // nicht aktiv
    --button-active-text-color: #333333;
    --button-active-color: #e0e0e0; // aktiv
    --button-hover-color: #444444; // hover

    --income-color: #B4E5A2;
    --expense-color: #FF9393;

    --list-item-background: #323232;
    
    --base-font-size: 16px; // Basis mobile Geräte   
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: system-ui;
    background-color: var(--background-color);
    color: var(--primary-text-color);
    font-size: var(--base-font-size); // Basis
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

  /***********************************************************************/

  
  /****************** NOCH NICHT ***************
   *********************************************
   
  @media (min-width: 768px) {
    :root {
      --base-font-size: 18px; // Tablet
    }

    h1 {
      font-size: 2rem;
    }

    h2 {
      font-size: 1.75rem;
    }

    h3 {
      font-size: 1.5rem;
    }

    p {
      font-size: 1rem;
    }
  }

  @media (min-width: 1024px) {
    :root {
      --base-font-size: 20px; // Desktop
    }

    h1 {
      font-size: 2.5rem;
    }

    h2 {
      font-size: 2rem;
    }

    h3 {
      font-size: 1.75rem;
    }

    p {
      font-size: 1.125rem;
    }
  }
  
  **********************************************
  ****************** NOCH NICHT ****************/
`;
