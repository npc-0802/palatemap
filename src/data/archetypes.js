export const ARCHETYPES = {
  Visceralist:   { palette: '#D4665A', weights: { plot:2, execution:2, acting:2, production:1, enjoyability:4, rewatchability:3, ending:1, uniqueness:1 }, quote: '"If I\'m not feeling it, nothing else matters."', description: 'You watch with your whole body. If a film doesn\'t move you — actually move you — you find it hard to call it great regardless of what the craft says. Your taste is honest, unguarded, and completely your own.', starterDescription: 'the films that hit you in the gut — emotionally honest, deeply rewatchable' },
  Formalist:     { palette: '#7AB0CF', weights: { plot:2, execution:4, acting:1, production:3, enjoyability:1, rewatchability:1, ending:1, uniqueness:2 }, quote: '"How you say it matters as much as what you say."', description: 'You\'re drawn to directors who think in images. The how of filmmaking holds your attention as much as the what — sometimes more. For you, style isn\'t decoration; it\'s the argument.', starterDescription: 'formal ambition and visual intelligence — the how matters as much as the what' },
  Narrativist:   { palette: '#D4A84B', weights: { plot:4, execution:2, acting:2, production:1, enjoyability:1, rewatchability:1, ending:3, uniqueness:1 }, quote: '"A great story can survive almost anything."', description: 'Story is your foundation. You can forgive weak production, uneven performances, almost anything — if the story earns it. You believe a great narrative is cinema\'s highest achievement.', starterDescription: 'airtight storytelling with endings that earn their weight' },
  Humanist:      { palette: '#E8906A', weights: { plot:2, execution:2, acting:4, production:1, enjoyability:2, rewatchability:1, ending:1, uniqueness:1 }, quote: '"I come for the story, I stay for the people."', description: 'You come for the story and stay for the people. What moves you most is a performance that makes you forget you\'re watching — a fully realized human being, right there on screen.', starterDescription: 'performances so real you forget you\'re watching — the people are the point' },
  Completionist: { palette: '#52BFA8', weights: { plot:2, execution:2, acting:1, production:1, enjoyability:1, rewatchability:1, ending:1, uniqueness:4 }, quote: '"I want something I\'ve never seen before."', description: 'You\'ve seen enough to recognize when something\'s been done before, and you\'re hungry for the genuinely new. Originality isn\'t a bonus for you — it\'s close to a requirement.', starterDescription: 'the genuinely singular — films that couldn\'t have been made by anyone else' },
  Sensualist:    { palette: '#B48FD4', weights: { plot:1, execution:4, acting:1, production:4, enjoyability:1, rewatchability:1, ending:1, uniqueness:1 }, quote: '"Cinema is first an aesthetic experience."', description: 'Cinema is, for you, first an aesthetic experience. You respond to texture, light, composition, sound design — the pure sensory architecture of a film. Some of your favorites barely need a plot.', starterDescription: 'pure sensory craft — score, cinematography, production as experience' },
  Revisionist:   { palette: '#7AB87A', weights: { plot:1, execution:2, acting:1, production:1, enjoyability:1, rewatchability:4, ending:2, uniqueness:2 }, quote: '"My first watch is just the beginning."', description: 'Your relationship with a film deepens over time. You rewatch, reconsider, and sit with things long after the credits roll. The first watch is often just the beginning — and you\'ve changed your mind on more films than most people have seen.', starterDescription: 'layers that reward revisiting — the kind that changes every time you return' },
  Absolutist:    { palette: '#A8C0D4', weights: { plot:3, execution:2, acting:1, production:1, enjoyability:1, rewatchability:1, ending:4, uniqueness:1 }, quote: '"The ending is the argument."', description: 'The ending is the argument. A film can be brilliant for two hours and lose you in the final ten minutes — and that loss matters. A great ending doesn\'t just conclude; it reframes everything that came before.', starterDescription: 'conclusions that reframe everything before them — the ending is the argument' },
  Atmospherist:  { palette: '#D4A8BE', weights: { plot:1, execution:2, acting:1, production:3, enjoyability:4, rewatchability:2, ending:1, uniqueness:1 }, quote: '"The right film at the right moment is everything."', description: 'The right film at the right moment is almost a spiritual experience for you. Context is part of cinema itself — the mood, the night, who you watched it with. You chase that feeling more than you chase prestige.', starterDescription: 'the feeling a film leaves you with — mood, context, the right film at the right moment' },
};

export const OB_QUESTIONS = [
  {
    q: 'You finish a film that you admired more than you enjoyed. How do you rate it?',
    options: [
      { key: 'A', text: 'Rate it highly. The craft speaks for itself.' },
      { key: 'B', text: 'Rate it somewhere in the middle. Both things are true.' },
      { key: 'C', text: "Rate it lower. If it didn't connect, something didn't work." },
      { key: 'D', text: 'Watch it again before deciding.' },
    ]
  },
  {
    q: "A film you've been completely absorbed in for two hours ends in a way that doesn't satisfy you. How much does that affect how you feel about the whole thing?",
    options: [
      { key: 'A', text: 'A lot. The ending is the argument. It reframes everything before it.' },
      { key: 'B', text: "Somewhat. It takes the edge off, but two great hours are still two great hours." },
      { key: 'C', text: "Not much. I was there for the ride, not the destination." },
      { key: 'D', text: "Depends on the film. Some endings are meant to be unresolved." },
    ]
  },
  {
    q: "Think about a film you've seen multiple times. Is there a version of that experience — a specific night, a specific mood, a specific person you watched it with — that you remember more than the film itself?",
    options: [
      { key: 'A', text: "Yes, and honestly that's a big part of why I love it." },
      { key: 'B', text: "Maybe, but I try to rate the film on its own terms." },
      { key: 'C', text: "Not really. A great film is great regardless of when you watch it." },
      { key: 'D', text: "I don't rewatch much. I'd rather see something new." },
    ]
  },
  {
    q: "It's a Sunday. You have the whole afternoon. You're scrolling through options and you see a film you've seen probably four or five times already. Do you put it on?",
    options: [
      { key: 'A', text: "Honestly, yeah. Sometimes that's exactly what the moment calls for." },
      { key: 'B', text: "Only if I'm in a specific mood for it. Otherwise I'd rather find something new." },
      { key: 'C', text: "Probably not. There's too much I haven't seen." },
      { key: 'D', text: "Depends who I'm watching with." },
    ]
  },
  {
    q: "Sometimes a performance makes you forget you're watching a film. You're not thinking about the script or the direction — you're just fully transported into a character's inner world. How much does that experience shape how you feel about a film overall?",
    options: [
      { key: 'A', text: "It's everything. A performance like that can carry a film for me." },
      { key: 'B', text: "It elevates it, but I need the rest of the film to hold up too." },
      { key: 'C', text: "I notice it, but it's one piece of a bigger picture." },
      { key: 'D', text: "Honestly I'm usually more absorbed by the world the film creates than the people in it." },
    ]
  },
  {
    q: "A film has one of the greatest performances you've ever seen. The script around it is a mess. Where do you land?",
    options: [
      { key: 'A', text: "Still a great film. That performance is the film." },
      { key: 'B', text: "Good but frustrating. What could have been." },
      { key: 'C', text: "The script drags it down significantly. A film is only as strong as its weakest part." },
      { key: 'D', text: "Depends how bad the script is. There's a threshold." },
    ]
  }
];
