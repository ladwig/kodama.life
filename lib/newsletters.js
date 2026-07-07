export const NEWSLETTERS = {
    '1': {
        date: '27.05.2026',
        content: [
            { type: 'text', italic: true, text: 'Well… look who followed the music into the trees.' },
            { type: 'text', italic: true, text: 'We are glad something sparked your interest.' },
            { type: 'text', text: 'sidequest is an all day/all night open air gathering being held on the outskirts of Berlin. You\'ll find yourself among beautiful pine, oak and linden trees. A little slice of nature not so far from the chaos of the city.' },
            { type: 'text', text: 'We want to create the kind of party where time slips sideways. Where daytime melts into dusk and the night somehow arrives too fast. A place where strangers become co-conspirators, under the sun and under the stars. A space for connections over silly conversations, losing track of time and random side quests.' },
            { type: 'text', text: 'Remember getting the tip for a party felt like finding buried treasure. Following obscure instructions, climbing fences, entering lock combinations and stopping in search of the sound of the guiding bass. Something that feels discovered and not advertised. If this excites you, then you\'ve come to the right place.' },
            {
                type: 'images',
                srcs: [
                    'https://resend-attachments.s3.amazonaws.com/fad16cf8-145d-49e1-ad6e-118774ec81bc',
                    'https://resend-attachments.s3.amazonaws.com/00b0a037-b84e-472a-908f-715b135208c1',
                    'https://resend-attachments.s3.amazonaws.com/5866731c-77a0-4b98-9c2d-13dbc79c564e',
                    'https://resend-attachments.s3.amazonaws.com/cc2401ba-1273-4982-9eba-0772eb6a80ec',
                ],
            },
            { type: 'text', text: 'We will soon be revealing more information, but for now stay in the loop via Telegram or this newsletter.' },
            { type: 'text', segments: [
                { text: 'Make sure to share with your friends, the ones you\'d want beside you as the sun comes up. Tickets are available now, grab yours early so we can plan accordingly. ' },
                { text: 'There are also a few group tickets available (4 for the price of 3) if you want to save some money and come with your crew.', bold: true },
            ]},
        ],
    },
    '2': {
        date: '07.07.2026',
        content: [
            { type: 'text', italic: true, text: 'The map is slowly unfolding.' },
            { type: 'text', italic: true, text: 'The path is becoming a little more clear.' },
            { type: 'text', text: "It's been hard keeping this to ourselves. We hope you're as excited to explore it as we are." },
            { type: 'images', srcs: ['https://cdn.resend.app/b2e18824-71c0-49fb-aae8-668775eb6475'] },
            { type: 'heading', text: 'Getting Involved' },
            { type: 'text', text: "Every tiny detail that makes the weekend feel effortless exists because someone chose to be part of building it. There's something pretty special about watching a place slowly appear from an empty patch of nature, then getting to enjoy it with everyone once the work is done." },
            { type: 'text', segments: [
                { text: "We're looking for curious people who want to be part of bringing sidequest to life. If setting things up, breaking things down or lending a hand over the weekend sounds like your thing, " },
                { text: 'apply as a volunteer', href: 'https://forms.gle/MHQy2ccDFyGbNK1L6' },
                { text: '.' },
            ]},
            { type: 'text', text: "PS: We don't want the ticket price to be the thing that stops someone taking on this sidequest. If you'd love to join us but it's out of reach right now, get in touch. We'll see what we can figure out together." },
        ],
    },
};
