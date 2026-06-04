import Bill from "./models/Bill.js";

const resolvers = {
  Query: {
    // Ambil semua bill dari database
    getBills: async () => {
      const bills = await Bill.find().sort({ createdAt: -1 });
      return bills.map(formatBill);
    },

    // Ambil satu bill berdasarkan ID
    getBill: async (_, { id }) => {
      const bill = await Bill.findById(id);
      if (!bill) {
        throw new Error(`Bill with id "${id}" not found`);
      }
      return formatBill(bill);
    },
  },

  Mutation: {
    // Buat bill baru
    createBill: async (_, { title, totalAmount, date }) => {
      const bill = new Bill({ title, totalAmount, date, participants: [] });
      await bill.save();
      return formatBill(bill);
    },

    // Update bill yang sudah ada
    updateBill: async (_, { id, title, totalAmount, date }) => {
      const bill = await Bill.findById(id);
      if (!bill) {
        throw new Error(`Bill with id "${id}" not found`);
      }

      if (title !== undefined) bill.title = title;
      if (totalAmount !== undefined) bill.totalAmount = totalAmount;
      if (date !== undefined) bill.date = date;

      await bill.save();
      return formatBill(bill);
    },

    // Hapus bill
    deleteBill: async (_, { id }) => {
      const bill = await Bill.findByIdAndDelete(id);
      if (!bill) {
        throw new Error(`Bill with id "${id}" not found`);
      }
      return { success: true, message: `Bill "${bill.title}" deleted` };
    },

    // Tambah peserta ke bill
    addParticipant: async (_, { billId, name, amountOwed }) => {
      const bill = await Bill.findById(billId);
      if (!bill) {
        throw new Error(`Bill with id "${billId}" not found`);
      }

      bill.participants.push({ name, amountOwed, isPaid: false });
      await bill.save();

      const added = bill.participants[bill.participants.length - 1];
      return formatParticipant(added);
    },

    // Update peserta (nama, jumlah, status bayar)
    updateParticipant: async (_, { billId, participantId, name, amountOwed, isPaid }) => {
      const bill = await Bill.findById(billId);
      if (!bill) {
        throw new Error(`Bill with id "${billId}" not found`);
      }

      const participant = bill.participants.id(participantId);
      if (!participant) {
        throw new Error(`Participant with id "${participantId}" not found`);
      }

      if (name !== undefined) participant.name = name;
      if (amountOwed !== undefined) participant.amountOwed = amountOwed;
      if (isPaid !== undefined) participant.isPaid = isPaid;

      await bill.save();
      return formatParticipant(participant);
    },

    // Hapus peserta dari bill
    removeParticipant: async (_, { billId, participantId }) => {
      const bill = await Bill.findById(billId);
      if (!bill) {
        throw new Error(`Bill with id "${billId}" not found`);
      }

      const participant = bill.participants.id(participantId);
      if (!participant) {
        throw new Error(`Participant with id "${participantId}" not found`);
      }

      participant.deleteOne();
      await bill.save();
      return { success: true, message: `Participant "${participant.name}" removed` };
    },
  },
};

// ── Helper functions ────────────────────────────────────────────

function formatBill(bill) {
  return {
    id: bill._id.toString(),
    title: bill.title,
    totalAmount: bill.totalAmount,
    date: bill.date,
    participants: bill.participants.map(formatParticipant),
  };
}

function formatParticipant(p) {
  return {
    id: p._id.toString(),
    name: p.name,
    amountOwed: p.amountOwed,
    isPaid: p.isPaid,
  };
}

export default resolvers;
