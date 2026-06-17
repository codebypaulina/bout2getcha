import styled from "styled-components";

export default function StatusMessage({ variant = "loading", message }) {
  const isError = variant === "error";

  return (
    <Message role={isError ? "alert" : "status"} $variant={variant}>
      {message}
    </Message>
  );
}

const Message = styled.p`
  width: 100%;
  text-align: center;
  font-weight: bold;
  color: ${({ $variant }) =>
    $variant === "error"
      ? "var(--expense-color)"
      : "var(--secondary-text-color)"};
`;
