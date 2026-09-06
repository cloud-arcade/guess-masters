/**
 * App — root component.
 *
 * All game state lives in GameContainer and the useDateGame hook; there is no
 * global context, because nothing outside the container needs it.
 */

import { GameContainer } from './components/GameContainer';

export default function App() {
  return <GameContainer />;
}
