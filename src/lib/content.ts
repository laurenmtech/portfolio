import { getCollection, getEntry } from 'astro:content';

export async function getProjects() {
  const all = await getCollection('projects', ({ data }) => !data.draft);
  return all.sort((a, b) => a.data.order - b.data.order);
}

export async function getProfile() {
  const profile = await getEntry('profile', 'me');
  if (!profile) throw new Error('src/content/profile.yaml must have an entry with id "me"');
  return profile.data;
}
