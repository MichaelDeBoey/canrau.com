import * as mdxBundler from "mdx-bundler";
import { getMDXExport } from "mdx-bundler/client";
import { remarkMdxImages } from "remark-mdx-images";
import { join, resolve } from "path";
import { readFile } from "fs/promises";
import { isWhitespaceCharacter } from "is-whitespace-character";
import { author, rootUrl } from "/config";
// import { type Frontmatter } from "~/utils/mdx.server";

// from https://stackoverflow.com/a/60617060/3484824
// type IBundleMdx = {
//   cwd: string;
// } & (
//   | {
//       file: string;
//       source?: never;
//     }
//   | {
//       source: string;
//       file?: never;
//     }
// );
// from https://stackoverflow.com/a/65973298/3484824
// type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
// type PartialReq<T, Keys extends keyof T = keyof T> = Pick<
//   Partial<Required<T>>,
//   Exclude<keyof T, Keys>
// > & {
//   [K in Keys]: T[K];
// };
// type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
//   T,
//   Exclude<keyof T, Keys>
// > &
//   {
//     [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
//   }[Keys];
// type IBundleMdx = RequiredKeys<
//   {
//     cwd?: string;
//     file?: string;
//     source?: string;
//   },
//   "file" | "source"
// >;
type IBundleMdx = {
  cwd?: string;
  source: string;
};

export const getContentPath = (slug: string) => resolve("content", slug);

export const getFilePath = (contentPath: string, filename: string) =>
  resolve(contentPath, filename);

// based on https://github.com/micromark/micromark-extension-gfm-strikethrough/blob/main/dev/lib/syntax.js
// const kbdHtml = {
//   enter: {
//     strikethrough() {
//       this.tag('<del>')
//     }
//   },
//   exit: {
//     strikethrough() {
//       this.tag('</del>')
//     }
//   }
// }

// const remarkKbd = (options = {}) =>{
//   return (node: any) => {

//   }
// }

export const bundleMDX = async ({ cwd, source }: IBundleMdx) => {
  // const source = await readFile(file, { encoding: "utf-8" });
  // note: alternative https://github.com/stefanprobst/rehype-extract-toc/
  const { default: remarkToc } = await import("remark-toc");
  const { default: remarkGfm } = await import("remark-gfm");
  const { default: remarkGithub } = await import("remark-github");
  const { default: remarkBreaks } = await import("remark-breaks");
  const { default: remarkFootnotes } = await import("remark-footnotes");
  const { default: rehypeExternalLinks } = await import(
    "rehype-external-links"
  );
  const { default: rehypeSlug } = await import("rehype-slug");
  const { default: linkHeadings } = await import("rehype-autolink-headings");
  // todo: maybe use Ryan's syntax highlighter [like KCD](https://github.com/kentcdodds/kentcdodds.com/commit/9d853711ed0bf985c0dbda1981184f47965a41b9)
  // todo: or look into [stitch.dev's highlighter](https://github.com/modulz/stitches-site/tree/master/lib)
  // note: useClipboard Hook by [stitches-site](https://github.com/modulz/stitches-site/blob/master/lib/useClipboard.ts)
  const { default: rehypePrism } = await import("rehype-prism-plus");
  const { visit, EXIT } = await import("unist-util-visit");
  // const { headingRank } = await import("hast-util-heading-rank");
  // const { valueToEstree } = await import("estree-util-value-to-estree");
  // const { default: rehypeToc } = await import(
  //   "@stefanprobst/rehype-extract-toc"
  // );
  // const { default: rehypeTocExport } = await import(
  //   "@stefanprobst/rehype-extract-toc/mdx"
  // );

  // let toc: any;

  // todo: use [@remark-embedder/core](https://github.com/remark-embedder/core) and/or mdx-embed.com
  // also https://github.com/remark-embedder/transformer-oembed & https://github.com/remark-embedder/cache
  const mdx = await mdxBundler.bundleMDX({
    cwd,
    source,
    // bundleDirectory: resolve("public", "build"),
    // bundlePath: resolve("public"),
    grayMatterOptions: (options) => {
      // todo: possibly improve [excerpt](https://github.com/jonschlinkert/gray-matter#optionsexcerpt)?
      // options.excerpt = (file, options) => {
      //   file.excerpt = file.content.split("\n").slice(0, 4).join(" ");
      //   return file.excerpt;
      // };
      return options;
    },
    xdmOptions: (options) => {
      options.remarkPlugins = [
        ...(options.remarkPlugins ?? []),
        [
          remarkToc,
          {
            heading: "table[ -]of[ -]contents?|inhaltsverzeichnis",
            tight: true,
          },
        ],
        remarkMdxImages,
        // [remarkTocHeadings, { exportRef: toc }],
        remarkGfm,
        // remarkKbd,
        [remarkGithub, { repository: "canrau/canrau.com" }],
        remarkBreaks,
        // remarkCodeTitles,
        [remarkFootnotes, { inlineNotes: true }],
        [
          rehypeExternalLinks,
          {
            target: "_blank", // default
            // ref: ["nofollow", "noopener", "noreferrer"], // default
            ref: ["noopener", "noreferrer"],
            protocols: ["http", "https"], // default
            contentProperties: { className: ["alpha", "bravo"] },
            // note: [Giving users advanced warning when opening a new window](https://www.w3.org/WAI/WCAG21/Techniques/general/G201)
            content: { type: "text", value: " (opens in a new window)" },
            // alternative
            // content: [
            //   {type: 'text', value: ' ('},
            //   {
            //     type: 'element',
            //     tagName: 'em',
            //     properties: {},
            //     children: [{type: 'text', value: 'opens in a new window'}]
            //   },
            //   {type: 'text', value: ')'}
            // ],
          },
        ],
        // remarkMath,
        // remarkImgToJsx,
        // note: trying to set the cover to the first image
        // () => {
        //   return (tree) => {
        //     // console.log(JSON.stringify(tree.children.slice(0, 10), null, 2));
        //     let frontmatter = { value: "" };
        //     const isFrontmatter = { type: "yaml" };
        //     visit(tree, isFrontmatter, (node, index, parent) => {
        //       frontmatter = node;
        //     });
        //     const isImg = { type: "image" };
        //     // console.log(frontmatter);
        //     visit(tree, isImg, (node, index, parent) => {
        //       frontmatter.value = `${frontmatter.value}\nfirstImage: ${node.url}`;
        //       return EXIT;
        //     });
        //     // console.log(JSON.stringify(tree, null, 2));

        //     // const isYamlOrImg = (node: any) =>
        //     //   node.type === "yaml" ||
        //     //   (node.type === "mdxJsxTextElement" && node.name === "img");
        //     // visit(tree, isYamlOrImg, (node, index, parent) => {
        //     //   // node.value = node.value + "\ncover: blabla";
        //     //   console.log(node);
        //     // });
        //   };
        // },
      ];

      options.rehypePlugins = [
        ...(options.rehypePlugins ?? []),
        rehypeSlug,
        // rehypeToc,
        // rehypeTocExport,
        linkHeadings,
        [rehypePrism, { ignoreMissing: true, showLineNumbers: true }],
        () => {
          // const tokenClassNames: Record<string, string> = {
          //   tag: "text-code-red",
          //   "attr-name": "text-code-yellow",
          //   "attr-value": "text-code-green",
          //   deleted: "text-code-red",
          //   inserted: "text-code-green",
          //   punctuation: "text-code-white",
          //   keyword: "text-code-purple",
          //   string: "text-code-green",
          //   function: "text-code-blue",
          //   boolean: "text-code-red",
          //   comment: "text-gray-400 italic",
          // };
          return (tree, vfile) => {
            const headings: Array<any> = [];
            // todo: Extend counter to add #ids to all figures like images, videos, tweets etc
            let noOfCodeBlocks = 0;
            // const isImg = {type: "mdxJsxTextElement", name: "img"}
            // visit(tree, isImg, (node, index, parent) => {
            //   console.log(node);
            // });
            visit(tree, "element", (node, index, parent) => {
              // if (node.tagName === "p") {
              //   console.log(node.children);
              // }
              // const headingLevel = headingRank(node);
              // if (headingLevel === 1) {
              //   console.log(JSON.stringify(node, null, 2));
              // }
              // if (headingLevel !== null) {
              //   const heading: any = {
              //     depth: headingLevel,
              //     value: node,
              //   };
              //   if (
              //     node.properties !== undefined &&
              //     node.properties.id != null
              //   ) {
              //     heading.id = node.properties.id;
              //   }
              //   headings.push(heading);
              // }

              let [token, type] = node.properties.className || [];
              // console.log({ token, type });

              if (node.tagName === "pre") {
                noOfCodeBlocks++;
                const [lang] = node.properties.className || [];
                if (lang) {
                  node.properties.dataLang = lang.replace("language-", "");
                }
              }

              if (token === "code-line" && type === "line-number") {
                // done: not working for multiple code-blocks on the same page (yet)
                const figureId = `F${noOfCodeBlocks}`;
                const lineNo = `L${node.properties.line}`;
                node.properties.id = `${figureId}${lineNo}`;
              }

              if (token === "token") {
                // node.properties.className = [tokenClassNames[type]];
              }
            });

            // vfile.data.cantoc = createTree(headings) || []; // { test: "foo" };
            // tree.children.unshift({
            //   type: "mdxjsEsm",
            //   data: {
            //     estree: {
            //       type: "Program",
            //       sourceType: "module",
            //       body: [
            //         {
            //           type: "ExportNamedDeclaration",
            //           source: null,
            //           specifiers: [],
            //           declaration: {
            //             type: "VariableDeclaration",
            //             kind: "const",
            //             declarations: [
            //               {
            //                 type: "VariableDeclarator",
            //                 id: { type: "Identifier", name: "cantoc" },
            //                 init: "valueToEstree(vfile.data.cantoc)",
            //               },
            //             ],
            //           },
            //         },
            //       ],
            //     },
            //   },
            // });

            // function createTree(headings: Array<any>) {
            //   const root = { depth: 0, children: [] };
            //   const parents: Array<any> = [];
            //   let previous = root;

            //   headings.forEach((heading) => {
            //     if (heading.depth > previous.depth) {
            //       if (previous.children === undefined) {
            //         previous.children = [];
            //       }
            //       parents.push(previous);
            //     } else if (heading.depth < previous.depth) {
            //       while (parents[parents.length - 1].depth >= heading.depth) {
            //         parents.pop();
            //       }
            //     }

            //     parents[parents.length - 1].children.push(heading);
            //     previous = heading;
            //   });

            //   return root.children;
            // }
          };
        },
      ];

      return options;
    },
    esbuildOptions: (options) => {
      // Set the `outdir` to a public location for this bundle.
      // options.outdir = resolve("public", "build", "_assets");
      options.outdir = resolve("public/build/_assets");
      options.loader = {
        ...options.loader,
        ".png": "file",
        ".jpg": "file",
        ".jpeg": "file",
        ".ico": "file",
      };
      // Set the public path to /img/about
      options.publicPath = join("/build/_assets");

      // Set write to true so that esbuild will output the files.
      options.write = true;

      return options;
    },
  });

  // note: commented this solution in https://github.com/kentcdodds/mdx-bundler/issues/70
  const { cover, tableOfContents } = getMDXExport(mdx.code);
  mdx.frontmatter = {
    ...mdx.frontmatter,
    cover,
    tableOfContents,
    author,
    canonical: `${rootUrl}/${mdx.frontmatter?.lang}${mdx.frontmatter?.slug}`,
    // readingTime: readingTime(text), // todo: add reading-time
  };
  return mdx;
};