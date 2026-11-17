import { SceneRoot } from './scene/SceneRoot';
import { Hud } from './ui/Hud';
import { ControlPanel } from './ui/ControlPanel';
import { ClearModal } from './ui/ClearModal';
import { useKeyboardControls } from './input/useKeyboardControls';

export default function App() {
  useKeyboardControls();
  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#04060c] text-slate-100 select-none">
      <SceneRoot />
      <Hud />
      <ControlPanel />
      <ClearModal />
    </div>
  );
}
