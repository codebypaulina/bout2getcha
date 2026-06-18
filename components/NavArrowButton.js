import styled from "styled-components";
import PrevIcon from "@/public/icons/previous.svg";
import NextIcon from "@/public/icons/next.svg";

export default function NavArrowButton({
  direction,
  ariaLabel,
  disabled,
  onClick,
  buttonSize = 22,
  iconSize = 10,
  ...rest // für DatePicker (navLayout="around" greift sonst nicht)
}) {
  return (
    <Button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      $buttonSize={buttonSize}
      $iconSize={iconSize}
      {...rest}
    >
      {direction === "prev" ? (
        <PrevIcon className="prev" />
      ) : (
        <NextIcon className="next" />
      )}
    </Button>
  );
}

export const Button = styled.button`
  width: ${({ $buttonSize }) => $buttonSize}px;
  height: ${({ $buttonSize }) => $buttonSize}px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-button-bg);
  box-shadow: 0 0 10px rgba(0, 0, 0, 1);
  cursor: pointer;

  display: flex; // Zentrierung svg
  align-items: center;
  justify-content: center;

  svg {
    height: ${({ $iconSize }) => $iconSize}px;
    stroke: var(--color-button-text);
  }
  .prev {
    margin-right: 2px;
  }
  .next {
    margin-left: 2px;
  }

  &:hover {
    transform: scale(1.07);

    svg {
      stroke: var(--color-text-primary);
    }
  }

  &:disabled {
    opacity: 0.35;
    pointer-events: none;

    svg {
      stroke: #cccccc4f;
    }
  }
`;
