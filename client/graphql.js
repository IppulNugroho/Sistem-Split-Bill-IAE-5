/* ═══════════════════════════════════════════════════════════════
   GraphQL Client — Split Bill App
   Fetch-based client for Apollo Server, no external deps
   ═══════════════════════════════════════════════════════════════ */

const API_URL = 'http://localhost:4000/';

/**
 * Generic GraphQL fetch wrapper
 */
async function gqlRequest(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (json.errors) {
    const msg = json.errors.map(e => e.message).join(', ');
    throw new Error(msg);
  }

  return json.data;
}


/* ── Queries ──────────────────────────────────────────────────── */

export async function getBills() {
  const data = await gqlRequest(`
    query {
      getBills {
        id
        title
        totalAmount
        date
        participants {
          id
          name
          amountOwed
          isPaid
        }
      }
    }
  `);
  return data.getBills;
}

export async function getBill(id) {
  const data = await gqlRequest(`
    query GetBill($id: ID!) {
      getBill(id: $id) {
        id
        title
        totalAmount
        date
        participants {
          id
          name
          amountOwed
          isPaid
        }
      }
    }
  `, { id });
  return data.getBill;
}


/* ── Mutations ────────────────────────────────────────────────── */

export async function createBill(title, totalAmount, date) {
  const data = await gqlRequest(`
    mutation CreateBill($title: String!, $totalAmount: Float!, $date: String!) {
      createBill(title: $title, totalAmount: $totalAmount, date: $date) {
        id
        title
        totalAmount
        date
        participants {
          id
          name
          amountOwed
          isPaid
        }
      }
    }
  `, { title, totalAmount, date });
  return data.createBill;
}

export async function updateBill(id, fields) {
  const data = await gqlRequest(`
    mutation UpdateBill($id: ID!, $title: String, $totalAmount: Float, $date: String) {
      updateBill(id: $id, title: $title, totalAmount: $totalAmount, date: $date) {
        id
        title
        totalAmount
        date
        participants {
          id
          name
          amountOwed
          isPaid
        }
      }
    }
  `, { id, ...fields });
  return data.updateBill;
}

export async function deleteBill(id) {
  const data = await gqlRequest(`
    mutation DeleteBill($id: ID!) {
      deleteBill(id: $id) {
        success
        message
      }
    }
  `, { id });
  return data.deleteBill;
}

export async function addParticipant(billId, name, amountOwed) {
  const data = await gqlRequest(`
    mutation AddParticipant($billId: ID!, $name: String!, $amountOwed: Float!) {
      addParticipant(billId: $billId, name: $name, amountOwed: $amountOwed) {
        id
        name
        amountOwed
        isPaid
      }
    }
  `, { billId, name, amountOwed });
  return data.addParticipant;
}

export async function updateParticipant(billId, participantId, fields) {
  const data = await gqlRequest(`
    mutation UpdateParticipant(
      $billId: ID!,
      $participantId: ID!,
      $name: String,
      $amountOwed: Float,
      $isPaid: Boolean
    ) {
      updateParticipant(
        billId: $billId,
        participantId: $participantId,
        name: $name,
        amountOwed: $amountOwed,
        isPaid: $isPaid
      ) {
        id
        name
        amountOwed
        isPaid
      }
    }
  `, { billId, participantId, ...fields });
  return data.updateParticipant;
}

export async function removeParticipant(billId, participantId) {
  const data = await gqlRequest(`
    mutation RemoveParticipant($billId: ID!, $participantId: ID!) {
      removeParticipant(billId: $billId, participantId: $participantId) {
        success
        message
      }
    }
  `, { billId, participantId });
  return data.removeParticipant;
}
