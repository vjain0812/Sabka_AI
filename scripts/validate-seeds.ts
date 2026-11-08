import { demoProfiles, fixtureMetadata } from '../src/lib/fixtures/businesses';
import { businessBriefSchema } from '../src/lib/domain/brief';
for (const [name, profile] of Object.entries(demoProfiles)) {
  businessBriefSchema.parse(profile);
  console.log(`VALID fictional business: ${name}`);
}
console.log(JSON.stringify(fixtureMetadata));
