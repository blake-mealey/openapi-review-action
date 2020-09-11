# OpenAPI Review Action

A GitHub action for reviewing changes to your OpenAPI specs.

This action supports the `pull_request` event and posts comments to PRs which make changes to your
OpenAPI specs which help your reviewers ensure your specs are in a good condition.

## Example usage

```yaml
uses: actions/openapi-docs-in-pr-action@v1.0.0
with:
  spec-paths: ./specs/*.yaml
  github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

### spec-paths (required)

The paths to the OpenAPI specs to process (single glob or array of globs). See the
[glob](https://www.npmjs.com/package/glob) package for information on glob syntax support. JSON and
yaml files are supported. Relative paths must start with `./`.

```yml
spec-paths: ./your-spec.json
```

```yml
spec-paths: [./your-spec.yaml, ./your-spec.json]
```

```yml
spec-paths: [./root-spec.yaml, ./specs/*.yaml]
```

### github-token (required)

Your GitHub token to allow the action to create PR comments. Use the `${{ secrets.GITHUB_TOKEN }}`
variable.

```yml
github-token: ${{ secrets.GITHUB_TOKEN }}
```

### converter-options (optional)

Optionally pass options to the widdershins OpenAPI docs converter. See available options in [their
documentation](https://github.com/Mermade/widdershins#options).

```yml
converter-options:
  expandBody: true
  # ...
```
