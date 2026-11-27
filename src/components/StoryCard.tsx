import { Sheet } from './Sheet';

export function StoryCard({ name, onBegin }: { name: string; onBegin: () => void }) {
  return (
    <Sheet title="The lost treasure" className="story">
      <p className="story-text">
        Welcome, <b>{name}</b>! The story goes that a railroad worker once hid a <b>chest of gold</b> near the old stone train
        depot, built in 1888. Then he split the treasure map into <b>6 fragments</b> and tucked them away around San Carlos.
      </p>
      <p className="story-text">
        Win a challenge to grab each fragment, then solve a riddle to find out where the next one hides. Ready, explorer?
      </p>
      <div className="row">
        <button type="button" className="btn btn-go wide" data-autofocus onClick={onBegin}>Let's go!</button>
      </div>
    </Sheet>
  );
}
