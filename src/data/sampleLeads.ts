import { Lead } from '@/types/lead';

export const sampleLeads: Lead[] = [
  {
    rank: 1,
    score: 92,
    name: "Columbia Family Dentistry",
    city: "Columbia",
    state: "SC",
    website: undefined,
    phone: "+1-803-555-0123",
    signals: {
      no_website: true,
      has_chatbot: false,
      has_online_booking: false,
      owner_identified: true,
    },
    owner: "Dr. Sarah Johnson",
    owner_email: "sarah@columbiafamilydentistry.com",
    review_count: 87,
    status: "new",
    tags: ["High Priority", "Dentist-Columbia"],
    business: {
      id: "1",
      name: "Columbia Family Dentistry",
      vertical: "dentist",
      phone: "+1-803-555-0123",
      address_json: {
        street: "1234 Main Street",
        city: "Columbia",
        state: "SC",
        zip: "29201",
        country: "US"
      },
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z"
    },
    people: [
      {
        id: "p1",
        business_id: "1",
        name: "Dr. Sarah Johnson",
        role: "Owner/Principal Dentist",
        email: "sarah@columbiafamilydentistry.com",
        phone: "+1-803-555-0123",
        confidence: 0.95,
        created_at: "2024-01-15T10:00:00Z"
      }
    ],
    signal_details: [],
    notes: [
      {
        id: "n1",
        business_id: "1",
        text: "High-potential lead. Family practice with excellent reviews but missing digital presence.",
        created_at: "2024-01-15T10:00:00Z"
      }
    ]
  },
  {
    rank: 2,
    score: 87,
    name: "Goose Creek Family Dentistry",
    city: "Goose Creek", 
    state: "SC",
    website: "https://goosecreekfamilydentistry.com",
    phone: "+1-843-555-0199",
    signals: {
      no_website: false,
      has_chatbot: false,
      has_online_booking: false,
      owner_identified: true,
    },
    owner: "Dr. Maria Vega",
    review_count: 112,
    status: "new",
    tags: ["Dentist-GooseCreek"],
    business: {
      id: "2",
      name: "Goose Creek Family Dentistry",
      vertical: "dentist",
      website: "https://goosecreekfamilydentistry.com",
      phone: "+1-843-555-0199",
      address_json: {
        street: "5678 Red Bank Rd",
        city: "Goose Creek",
        state: "SC",
        zip: "29445",
        country: "US"
      },
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z"
    },
    people: [
      {
        id: "p2",
        business_id: "2",
        name: "Dr. Maria Vega",
        role: "Owner",
        confidence: 0.88,
        created_at: "2024-01-15T10:00:00Z"
      }
    ],
    signal_details: [],
    notes: []
  },
  {
    rank: 3,
    score: 75,
    name: "Charleston Law Associates",
    city: "Charleston",
    state: "SC",
    website: "https://charlestonlaw.com",
    phone: "+1-843-555-0234",
    signals: {
      no_website: false,
      has_chatbot: false,
      has_online_booking: false,
      owner_identified: true,
    },
    owner: "John Mitchell, Esq.",
    review_count: 45,
    status: "qualified",
    tags: ["Law Firm", "Charleston"],
    business: {
      id: "3",
      name: "Charleston Law Associates",
      vertical: "law_firm",
      website: "https://charlestonlaw.com",
      phone: "+1-843-555-0234",
      address_json: {
        street: "789 King Street",
        city: "Charleston",
        state: "SC",
        zip: "29401",
        country: "US"
      },
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z"
    },
    people: [
      {
        id: "p3",
        business_id: "3",
        name: "John Mitchell",
        role: "Managing Partner",
        email: "jmitchell@charlestonlaw.com",
        confidence: 0.92,
        created_at: "2024-01-15T10:00:00Z"
      }
    ],
    signal_details: [],
    notes: [
      {
        id: "n3",
        business_id: "3",
        text: "Interested in AI for client intake. Follow up next week.",
        created_at: "2024-01-15T10:00:00Z"
      }
    ]
  },
  {
    rank: 4,
    score: 68,
    name: "Premier HVAC Solutions",
    city: "Columbia",
    state: "SC",
    website: undefined,
    phone: "+1-803-555-0345",
    signals: {
      no_website: true,
      has_chatbot: false,
      has_online_booking: false,
      owner_identified: false,
    },
    review_count: 23,
    status: "new",
    tags: ["HVAC", "No Website"],
    business: {
      id: "4",
      name: "Premier HVAC Solutions",
      vertical: "hvac",
      phone: "+1-803-555-0345",
      address_json: {
        street: "321 Industrial Blvd",
        city: "Columbia",
        state: "SC",
        zip: "29203",
        country: "US"
      },
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z"
    },
    people: [],
    signal_details: [],
    notes: []
  },
  {
    rank: 5,
    score: 58,
    name: "Downtown Dental Group",
    city: "Columbia",
    state: "SC",
    website: "https://downtowndental.com",
    phone: "+1-803-555-0456",
    signals: {
      no_website: false,
      has_chatbot: true,
      has_online_booking: true,
      owner_identified: false,
    },
    review_count: 156,
    status: "ignored",
    tags: ["Dentist-Columbia", "Has Tech"],
    business: {
      id: "5",
      name: "Downtown Dental Group",
      vertical: "dentist",
      website: "https://downtowndental.com",
      phone: "+1-803-555-0456",
      address_json: {
        street: "567 Main St",
        city: "Columbia",
        state: "SC",
        zip: "29201",
        country: "US"
      },
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z"
    },
    people: [],
    signal_details: [],
    notes: [
      {
        id: "n5",
        business_id: "5",
        text: "Already has comprehensive digital setup. Not a good fit.",
        created_at: "2024-01-15T10:00:00Z"
      }
    ]
  }
];