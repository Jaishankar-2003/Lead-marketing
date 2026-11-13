import { test, expect } from '../base/gmap_base';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('GMap Test Suite', () => {
    // Disable timeout so unlimited leads can be extracted without test runner aborting
    test.setTimeout(0);

    test('GMap Functionality Section', async ({ gmap }) => {
        // Unlimited leads by default.
        // If you ever want to limit the count, run: MAX_RESULTS=20 npx playwright test
        const maxResults = process.env.MAX_RESULTS
            ? parseInt(process.env.MAX_RESULTS, 10)
            : undefined;

        const results = await gmap.operation(
            "manufacturing companies in Madurai",
            { maxResults }
        );

        // Assertions
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);

        // Verify output file contains all extracted leads
        const outputPath = path.join(process.cwd(), 'output', 'gmap-results.json');
        const fileContent = await fs.readFile(outputPath, 'utf-8');
        const savedResults = JSON.parse(fileContent);

        expect(savedResults.length).toBe(results.length);
        console.log(`Test completed: ${results.length} total leads verified.`);
    });
});