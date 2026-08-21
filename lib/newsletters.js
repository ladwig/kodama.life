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
            { type: 'text', italic: true, segments: [
                { text: 'The map is slowly unfolding.' },
                { br: true },
                { text: 'The path is becoming a little more clear.' },
            ]},
            { type: 'text', text: "We've spent a lot of time putting this lineup together, thinking about the kind of journey we wanted the weekend to take. It's been hard keeping it to ourselves, and we really hope you're as excited to explore it as we are." },
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
    '3': {
        date: '21.08.2026',
        // Goes to people already on the guestlist — they're subscribed
        hideSignup: true,
        content: [
            { type: 'callout', title: 'Please note', text: "There won't be any entry without a QR code at the door. Please do not come if you don't have one already, there's little else here to do in the area unless you're open to booking a last minute flight." },
            { type: 'text', text: 'Dust off your dancing shoes, shake out your adventure gear, here are the clues to get you to sidequest this weekend.' },

            { type: 'heading', text: 'Getting there and back' },
            { type: 'text', text: "First, public transport to BER Airport. From there follow the bike path signs marked ‘Schönefeld’ (we will leave a couple of hints along the way too). It's a few minutes by bike along the marked path, or about a 35-minute walk on that same bike path." },
            { type: 'text', text: 'The way may feel strange, but trust us on this one.' },
            { type: 'text', segments: [
                { text: 'Open the route and maps for each way of getting here', href: '/directions' },
            ]},
            { type: 'text', text: "Prefer not to walk? Take a taxi or Uber, from the airport or straight from Berlin to the drop-off point marked on the map. From there it's roughly 10 min on foot along the bike path." },
            { type: 'callout', title: 'Important', segments: [
                { text: 'Only use the ' },
                { text: 'marked pick-up point (the roundabout)', href: '/directions' },
                { text: " for taxis and Uber's and walk the rest of the bike path. Driving a car along the bike path is strictly prohibited." },
            ]},
            { type: 'text', segments: [
                { text: 'Please avoid coming by car. If you do, please use the ' },
                { text: 'marked path and parking area', href: '/directions' },
                { text: ' and do not take any other route.' },
            ]},
            { type: 'text', text: "Please note that the path is uneven in places, so it's not step-free throughout. If you need support getting there or moving around on site, get in touch beforehand." },

            { type: 'heading', text: 'On the way in and out' },
            { type: 'text', text: "We're close to the airport and to people who live nearby. Please don't leave any trash, keep the noise down, and look out for each other. Please do not enter or approach any airport facilities, such as the fence surrounding the runway." },
            { type: 'text', text: 'If you arrive or leave after dark there will be limited light, so a flashlight or phone torch will be your friend.' },

            { type: 'heading', text: 'Times' },
            { type: 'text', segments: [
                { text: 'Doors open at ' },
                { text: '12:00 midday', bold: true },
                { text: '. We expect to close around ' },
                { text: '11:00 on Sunday morning', bold: true },
                { text: '.' },
            ]},

            { type: 'heading', text: 'Pack for your adventure' },
            { type: 'text', text: 'sidequest is loooooooooong and you will need to be prepared. It can get quite chilly after dark and hot during the day. Bring warm layers (a raincoat might be a good idea too), a water bottle, a blanket, sunscreen, enough snacks, whatever is going to carry those legs wayyyy past sunrise.' },

            { type: 'heading', text: 'Bar and Food' },
            { type: 'text', segments: [
                { text: "We've got a well-stocked bar serving up ice cold drinks all day long. Food and snacks are available too. " },
                { text: 'Bring cash!', bold: true },
            ]},

            { type: 'heading', text: 'Membership & entry' },
            { type: 'text', text: "sidequest is a private event. No membership (QR code) received in advance, no entry. A QR code doesn't guarantee entry; we reserve the right to refuse at the door." },

            { type: 'heading', text: 'Sustainability' },
            { type: 'text', text: 'We intend to leave the site exactly as we found it.' },
            { type: 'text', text: 'The ground is dry and fire is a real risk, so cigarettes are to be disposed of correctly (we have portable ashtrays available).' },
            { type: 'text', text: "Trash goes in the bins (pick up a bit extra whilst you're at it), return Pfand to the bar or in the crates situated around the site." },

            { type: 'heading', text: 'Zero tolerance' },
            { type: 'text', text: 'Discrimination, harassment, hate speech, or abusive behavior based on race, ethnicity, nationality, religion, gender identity or expression, sexual orientation, disability, age, or any other protected characteristic will not be tolerated. We are committed to creating a welcoming, inclusive, and accessible space for everyone.' },

            { type: 'heading', text: 'Awareness' },
            { type: 'text', text: 'Our awareness team will be roaming around the site wearing glowing wristbands and vests. There will also be a dedicated awareness chill out space if you need a break.' },
            { type: 'text', text: 'If you feel unwell, unsafe or just off at any point, find one of our awareness team members or any member of staff. They will most easily be found at the gate or bar. We have an incredibly skilled crew that are always about to support.' },

            { type: 'heading', text: 'Consumption' },
            { type: 'text', text: 'No open consumption on site. Beyond that, be responsible - with yourself and with everyone around you.' },
        ],
    },
};
