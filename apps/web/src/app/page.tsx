import { LayersPanel } from '@/components/panel/LayersPanel';
import { Timebar } from '@/components/timebar/Timebar';
import { Divider } from '@/components/compare/Divider';

export default function Home() {
  return (
    <div className="relative h-screen w-screen">
      <LayersPanel />
      <div className="absolute bottom-0 w-full">
        <Timebar />
      </div>
      <Divider />
    </div>
  );
}
