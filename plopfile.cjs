module.exports = function (plop) {
    // Register handlebars helpers
    plop.setHelper('eq', function (a, b) {
        return a === b;
    });

    plop.setGenerator('create-tool', {
        description: 'Generate a TypeScript tool class and its test',
        prompts: [
            {
                type: 'list',
                name: 'toolType',
                message: 'What type of tool do you want to create?',
                choices: [
                    {
                        name: 'Mapbox tool (makes API calls to Mapbox services)',
                        value: 'api-based'
                    },
                    {
                        name: 'Local tool (local processing, no API calls)',
                        value: 'local'
                    }
                ]
            },
            {
                type: 'input',
                name: 'name',
                message: 'Tool name without suffix using PascalCase e.g. Search:',
            },
        ],
        actions: function(data) {
            const actions = [];
            
            // Choose template based on tool type
            const toolTemplate = data.toolType === 'api-based' ? 'plop-templates/mapbox-api-tool.hbs' : 'plop-templates/local-tool.hbs';
            const testTemplate = data.toolType === 'api-based' ? 'plop-templates/mapbox-api-tool.test.hbs' : 'plop-templates/local-tool.test.hbs';
            const schemaTemplate = 'plop-templates/tool.schema.hbs'; // Unified schema template
            
            actions.push({
                type: 'add',
                path: 'src/tools/{{kebabCase name}}-tool/{{pascalCase name}}Tool.schema.ts',
                templateFile: schemaTemplate,
                data: { toolType: data.toolType }, // Pass toolType to template
            });
            
            actions.push({
                type: 'add',
                path: 'src/tools/{{kebabCase name}}-tool/{{pascalCase name}}Tool.ts',
                templateFile: toolTemplate,
            });
            
            actions.push({
                type: 'add',
                path: 'src/tools/{{kebabCase name}}-tool/{{pascalCase name}}Tool.test.ts',
                templateFile: testTemplate,
            });
            
            actions.push({
                type: 'append',
                path: 'src/index.ts',
                pattern: /(\/\/ INSERT NEW TOOL REGISTRATION HERE)/,
                template: 'new {{pascalCase name}}Tool().installTo(server);',
            });
            
            actions.push({
                type: 'append',
                path: 'src/index.ts',
                pattern: /(\/\/ INSERT NEW TOOL IMPORT HERE)/,
                template: "import { {{pascalCase name}}Tool } from './tools/{{kebabCase name}}-tool/{{pascalCase name}}Tool.js';",
            });
            
            actions.push({
                type: 'append',
                path: 'README.md',
                pattern: /(### Tools)/,
                template: '\n\n#### {{titleCase name}} tool\n\nDescription goes here...',
            });
            
            console.log('\n🎉 Tool created successfully!');
            console.log('\n📝 Next steps:');
            console.log('1. Update the input schema in {{pascalCase name}}Tool.schema.ts');
            console.log('2. Update the tool description in {{pascalCase name}}Tool.ts');
            console.log('3. Implement the tool logic in the execute method');
            console.log('4. Update the test cases with actual test data');
            console.log('5. Update the snapshot test to include the new tool:');
            console.log('   npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot');
            console.log('6. Run all tests to ensure everything works:');
            console.log('   npm test');
            
            return actions;
        },
    });
};