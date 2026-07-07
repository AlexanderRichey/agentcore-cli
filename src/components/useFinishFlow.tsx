import { useNavigate } from "react-router";

// useFinishFlow returns the navigation used at the moment a flow (a create/
// update wizard or a delete confirmation) completes successfully. Landing
// screens go back with esc via navigate(-1), so pushing the destination
// straight onto the finished flow would make esc re-enter a wizard that has
// already run. Instead the finished flow's history entry is replaced with its
// menu screen before the destination is pushed, so esc from the landing screen
// returns to the menu.
export function useFinishFlow(menuPath: string): (to: string) => void {
  const navigate = useNavigate();
  return (to) => {
    navigate(menuPath, { replace: true });
    navigate(to);
  };
}
