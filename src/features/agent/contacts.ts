import * as Contacts from 'expo-contacts';

/**
 * Contact lookup.
 *
 * The model is told to ask for a name ("mum", "landlord") rather than a number, so
 * something has to turn the name into digits. Matching is deliberately loose and
 * case-insensitive: contacts are stored as the user typed them, and a strict match
 * would push the model into inventing numbers.
 *
 * The full name and its own numbers are returned — the model never sees the whole
 * address book, which keeps the prompt small enough for a 0.5B to stay on task.
 */
export async function findContact(name: string): Promise<string> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Ndimi needs permission to read contacts to look that name up.');
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
    name,
    pageSize: 8,
  });

  const needle = name.toLowerCase();
  const matches = data.flatMap((contact) => {
    const label = (contact.name ?? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`).trim();
    if (!label.toLowerCase().includes(needle)) return [];
    const number = contact.phoneNumbers?.[0]?.number;
    if (!number) return [];
    return [`${label}: ${number}`];
  });

  if (matches.length === 0) throw new Error(`No contact called "${name}" with a number.`);
  return matches.join('\n');
}
