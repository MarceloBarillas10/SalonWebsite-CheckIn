async function addPerson(name, email, phone, membershipTypeId = null) {
  await fetch('/api/add-new-person', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, membershipTypeId }),
  });
}

async function verifyPerson(name, email, phone) {
  console.log("Verifying person with", { name, email, phone });
  const response = await fetch('/api/verify-person', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone })
  });
  const data = await response.json();
  console.log("This ran with data", data);
  return data.exists ? data.id : null;
}

export { addPerson, verifyPerson };