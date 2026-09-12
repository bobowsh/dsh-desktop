window.__ModuleLoader__.load({
	id: "workbuddy-hero",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const reactDom = require("react-dom");
		//#region helpers
		const h = (type, props, ...children) => react.createElement(type, props, ...children);
		/** Feather/Lucide 风格线性图标（stroke=currentColor，24 viewBox）。 */
		const ICONS = {
			coffee: `<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>`,
			code: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,
			palette: `<circle cx="13.5" cy="6.5" r=".9"/><circle cx="17.5" cy="10.5" r=".9"/><circle cx="8.5" cy="7.5" r=".9"/><circle cx="6.5" cy="12.5" r=".9"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>`,
			atsign: `<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>`,
			globe: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
			bot: `<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>`,
			tool: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
			branch: `<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>`,
			doc: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`,
			list: `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`,
			mail: `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>`,
			grid: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`,
			database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
			image: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>`,
			pentool: `<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>`,
			droplet: `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>`,
			edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>`,
			layout: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>`
		};
		function Icon({ name, size = 16 }) {
			return h("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.8,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				style: { flex: "none" },
				dangerouslySetInnerHTML: { __html: ICONS[name] ?? "" }
			});
		}
		//#endregion
		//#region data
		const TABS = [
			{
				id: "office",
				label: "日常办公",
				icon: "coffee",
				chips: [
					{ icon: "doc", label: "写周报", prompt: "帮我根据当前工作区最近的 Git 提交与改动写一份周报，重点突出进展、数据与风险。" },
					{ icon: "list", label: "会议纪要", prompt: "帮我整理一份会议纪要，输出背景、讨论要点、决议与待办清单：" },
					{ icon: "mail", label: "邮件润色", prompt: "帮我润色一封邮件，语气专业、简洁得体，内容如下：" },
					{ icon: "grid", label: "Excel 公式", prompt: "帮我写一个 Excel 公式/函数，需求：" },
					{ icon: "globe", label: "翻译润色", prompt: "帮我翻译并润色以下内容，保持原意与语气：" },
					{ icon: "database", label: "数据整理", prompt: "帮我整理这份数据，输出结构化表格并给出要点总结：" }
				]
			},
			{
				id: "code",
				label: "代码开发",
				icon: "code",
				chips: [
					{ icon: "atsign", label: "日常开发", prompt: "先浏览当前工作区的代码结构，然后帮我实现以下需求：" },
					{ icon: "globe", label: "网站开发", prompt: "帮我开发一个网页，要求：" },
					{ icon: "bot", label: "Agent 应用", prompt: "帮我设计并实现一个 Agent 应用，需求：" },
					{ icon: "tool", label: "Skill 开发", prompt: "帮我写一个 DSH skill，用途：" },
					{ icon: "branch", label: "CI/CD", prompt: "帮我搭建一条 CI/CD 流水线，要求：" },
					{ icon: "doc", label: "文档", prompt: "帮我为当前项目写一份使用文档，包含安装、配置与常见问题。" }
				]
			},
			{
				id: "design",
				label: "设计创意",
				icon: "palette",
				chips: [
					{ icon: "image", label: "海报设计", prompt: "帮我设计一张海报，给出文案、构图与配色建议，主题：" },
					{ icon: "pentool", label: "Logo 构思", prompt: "帮我构思一组 Logo 方案，包含创意说明与配色，品牌：" },
					{ icon: "droplet", label: "配色方案", prompt: "帮我为产品定一套配色方案（含色值与使用场景），风格：" },
					{ icon: "edit", label: "文案创作", prompt: "帮我写一段文案，要求有记忆点，主题：" },
					{ icon: "image", label: "插画创意", prompt: "帮我出几个插画创意，包含画面描述与风格关键词，主题：" },
					{ icon: "layout", label: "排版建议", prompt: "帮我优化以下内容的排版结构，使其更易读：" }
				]
			}
		];
		const PLACEHOLDER_TEXT = "今天帮你做些什么？ @ 引用对话文件，/ 调用技能与指令";
		/** 内嵌宇航员吉祥物（从目标设计稿裁剪 + 去底，115x102）。 */
		const MASCOT_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHMAAABmCAIAAAB3OjmZAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAADqfSURBVHhe7b11WFxptu9///zdc6a7k+644O7u7hQUlCAFVGGFFe7u7u7ubiG4ewgkuEuIJwQSJCEQ67mrqHSfTJ+5fTMzSXfO75n1rLzPpthF7f2p7/t919ol+V9//Xd8nfg32a8V/yb7teLfZL9W/Jvs14p/k/1a8W+yXyv+TfZrxb/Jfq34H0D27bt3h0dHB4ev9l4evNjf393f3zs4eHn46vDoNfzq407fXny7ZH/++efXx0e7ZJp7APS/jeTc3d8DykdHR7Dzx7t9M/GNkj1++3bv1csXB/u/TdDsAVm2v8n9g4M3b99+vPO3Ed8iWZj7z/f3nx/sP9/fI2+c6JQy/kaz5NwjK3f3ZHz9+vXHP/ENxDdH9uXRazLTE4VSxr9JwHoy/kazv+Te4TcD99si++r4iIL1b3J/v+rutMtsK3KsVGwoBxI24MeqzWmKfgEoZfyo3KNvAu43RBa89fnLAzLKl2SgoE0YgSlwFBnK/rsJv6renP5vyt3/Fjz3WyELi/uLlwc7B/uQAJQyhi31/Qbl383wpb5PPRdGWND+9GrhWyF7+OZ4B6T6iWY/EyslAe5vZHt0fPTxT/9J8a2QffHqJUWwlKy8O/0bdp+m5HBuzPqw/Gih8lhJ+sM5ieE8uPHEdj8WDKBcqHM//uk/Kb4Jsm/evdsBK6Bo9mRE3vy/eqv17PV7r/fgXn7LPVGbE45L3ZTbwXN/I9s/t0P7Jsi+PDoCrP83wYoOZeMna23nmtM3xxcOnn28z1//GrjSqzJWCr/9dc9PZQtu++dWYN8E2b3XhxTNUkaXubZfYenfrnl49PfnNZD9dTdKQin2qWZfHr76uOufEd8E2eevKFhP8mD/UyuY2H30caf/Fll3J5TGijG3qsSGcyk7gyF82qf9uVb7TZA9kep/JfQCv5I9fP/3K9OjD+9rHs8n3JsserpCnG2m7Ax33KV0aL9cW/i4958R3wTZ7Zf7lATNbh/sf0p2Yvfhx51+iQ8///z6w7uX799WP57/dTdKwh3/y2dP8uN9/oz4Rtzg5Sea/Rs3MJis3To+fPfzz29//nD84f3hCVNKVj+e+3U3SpLd4JNrC3svyW7wZ7UMfyZZOGfKae8evvpVtpAuc61/w2u8/Pb+1t3j/ZWXO/vv3nxKFupZseH/EjisYJ/67P6rl5QH+lPizyFLYQrx4cOHl4evn77Y2yEvYgeUsfLezK+wKBm6MZb1y9zP2Jw4eEcmW/5oNmhjNHhj9Fe4VXenyWr9JQ9evXr79i08BOURKQ/9h8WfQJbCFOLdhw9Pd170DIx19498qlnI33QKvmuDifenfv1Ra6Jq4Pk9tZulCjeKwu6Myd8ohBvBCn5zPffW7Zml5XUATH4wMOgPYNF/HN8/mizl3OAcodocunm7oKS66Xr3wPDE1v7u9olmyePfk+3/M0Gwzz8R7M7ui8GhG63t3R1dvavrd14fHVHI/mFw/1CylBODM7z/cKu+qbeypqV/cHxo5NbozcmNBw9P1ApkP8o2bPkfuCITttRHvpRDyZMVbPP+g/GJqRs3Jjq7+mrrro2M3dzdP3j//j3lMCjH81XjDyJLBkpG+uHt23fLq5tlVU3XWjoHhm8OjUzcvDUzPb+8uLr5DIRG0ewvnvuZcGE3ilp/1SxYwcLiytTMwq3J2dGbt3oHhq+3tvUODj568uT9iXL/AGf4I8hSzgQCpuTi4mZVXWdn7/DA0PjA8PiN8du3pmZnF5YXl9fvPnz8qWYpWXlv+neuzoC3Vp6YAHRuFLVSxjv3Hswvrt66Nd3a0V1WWZOTX5SWlVNWUTUwPPzg0aN378Dh/39BFk7j/Yf3r14dzs2tVtW3d/WPDY5ODY7cHhyeGB4dH781NTO/NL+4AqvNg2dbZLi/KJc8/mK7UIoBYugFIGHDZa4NoH96PffXfPh0a2l1vX/4Rn5hSXZeYV5xWU5BcXxiSnhkdHllVf/Q8Obde1Az/M8mC0dPidevj2bnV0qr21q6RpvbBxqau9u6h3r7RwcHRweHR0dvTNyenJmbX1hcXnu0vf2Lcn+r30+vLfz3pGB9urNzZ/N+e2dnclq6f1CoX3BYUXlVU1tXRnZ+UGhYXGLytdb24Zs37z14AL4EB/bxQL9CfF2yJx7w4c3bd4vLd0sq2653jrb1jBaX15fXNDR39HR09ff1DQ4MDPX3D/f2DQ0Ojdyeml1a3Xi0vQOy/Y3nUsT7SwJf8vjr9VzKCFgfPHzS0tqZnJpm6+Cooq6JxGjbu7jXNbXWX2sNi4wOCY8sKC3rHR6+eXvy8dNn799/xWrhq2v23fv3a3ceFZR0NDQND4/N1DV2VNZc6+oZHJuYhKqop2ewp6e/u6e3q7uvo7O3s7v31tT02vrmgydbsKD9RrOUBKDbINK/Ve723u7jra2nW9ttbV1Jyekka3tlVSQSraOjZ2hEtIqOT+7o7k/LzPH1D0pMSesdHIZCb/TW9PbzXagW4Ln/GnC/FtkTKfwMR/1w63lhZUt+YevozfnB4ZuTUwtLS+sLCyu3bk1B3hib6O7p7+zqbu/obmvvbmnvbGnrGLt5a23j7ub9x4+3t5+Raf6N536qWRi39/cfPduC2b3zfHd45EZiUpqNnZMKQgOpqaWJ1sXhTUwsbFw9/arrmsqr6nz8g6ITkmobm6fnF+qbO0YnpqBPg6LlfxhZwPp8/6ChYyghqXji1vL0zNKjJ0/XNjaXl1aXllZmZudvjk+AvwJHKDnbO3ra2nuut3Q0NbW1tLZPz8w9frq99Wz3ydb21vPnW7svnu3vgVQpmoXtpy9ePNra2rh7f2F5bXV9Y2t7Z35hBbA6Orkh1NFItDYSrYvVMTQ2Jdk6uDo4eeTkl1xr7ggJjwqPiiurqh+FGTM2XtbQPL+68eZkNfvicL+iG4C93pxZDI/PGRqeWlm9t7f/6vnu3p3Ne0vLq/PzizMzc7duTw0Nj96cuD0+MdnV3d/a2t3W1t3fPzQzM3/37v2d53vPtncfPn569/6Djc2763c24VlZW99YWV2HXFxaWVhanpufHx4ZnZmd23n+oqKi1sXVUwOlpYHWAR/QwOjp6puaWzq4uPm6efqnZuY1t3XFJaYGh0XnF1e09w5OzMzlV9RWXOvYfPDo7TvyavZl4X4tsmBej7d20vLK6xra5ufXd/devXv/Ye/g1ea9+8srq7NzC1PTM5NTM6Nj4719A7cnp6em50fHboNLPNvaefFib/vZzuMnWw8ePb57/+Gdu/dPsG6srG2srKzBE7OwuDQztzC3sDg0PNzV3Tszu7C0stHQ2OzpHaBHMFVH6SI0MJoYXSBrZung5OLn7ReWmpXf0t6bmV0YFBqdlV9yvbOvrW+wrac/KCa58lrzwydPQLlf1nC/FtnD10ddI+Mp6bmwIj199uzDB/K1AjA1ILW0vAIF1vTM7O2p6Rs3JwDNyOjYw0ePX+zuQT4jM3368OETwHrn7r2NTci7ZA9ZXV9aWQOpzi8szcETMzN76/at6upaMJThkbHRG+As07AwZmTlO7v66OoZqmtqa+sZEy3tHV18fAPDk9Kzm9t78grLAkMi07ILGlq7appaW7p7wxISfSKim7u6H5/A/dbJQj1w/9Gz1Lzyjs7+9Y07x2+O4UZYKIDs5r0H5Im8uDw7vwBkxyduA6Pl1bWnT7ee7+zC4v7o8VOKVDc/SnUTpLq0sgqynF9cmptfBL3DswJZXVvV2dE9OnIT6rbBwZFBSnU8eON6c2d8QrolyVmfYG5MtLZ1cvMJCI1NSr/e2lVcWh0QHJGUnlNzraWqoSm/tDyvtNze0y8yKQ2e4929vW+aLBwcCLZn6FZ2XuX01BLwotwOmt07eLlxZ3NxaXn5RH0rq2v3odkEJ4Wl/cHjrafbjwHrA4oD3Fu/A1K9A1KlMJ1dWIRZDyYwOT07OTU9NnYzOycbnLqvd7Cnd6CnZ6Cnu7+rqw8KjNa27uvNXQVFVUGhMY4uXtZQ0Hr7h8ckNrZ0llXV+QaGxSallVbX111vTc3ObWhpdfDwc/EJyi0o2djY/IK92ZcnS3bYp89yimp6em5sbDx4c/zx7RRQOEJhtLK2vri8vLZ+59HjJ7u7ezvbzzfWN9fX7jwAoT4CrI/u3X0AqxwwpUh1fnF5bmFpBtyDbCAL07OLQBPglpWVdrR3DkBl2t0Hqx/UwifVRTe0Cdeb2xsa22rrrpeV10bHJrt6+Lq4+/iHRNQ2tZVV13sHhETEJuaVVDa1d+UUFheWlSdlFZjZuHj5Brd19Lx8+cVeSP/yZI/fvJ2YnE/PKpmdW93e+Ti/4B/c/ujJFizoi8urT7eevTp8DWTvbd5fXQHDuHv//iPIu2Ss5DJgdX1zYWVtdnF5GqqIucXJ2cWpGVj0wEDmxsYnAW5qStKNsVuAEph2dPS0/8K06XpbfWNzdU1jRUVdXl5xamp2anoO1APuPgHltU2llfWefkFBETEZuUV1TW2VdY1J6en119tNSVBWBMQnpW7e+2KXFL482dfHbxqbumrrWtbvPDg8Ir+mDYf57sN7ismCUYKBAtb9/f3Hj5+AWldXYZUCsT59+GQLaiyyyT58fOf+oxWozzY2lkDjq2vLy5vLyxuLy+vAemFls7WlubG+vqNrAOrf6y2dzS0dkE3XWxuvtdTVN1VW1ZWVVRUUFGdkZJeXV9fUX88vrgyKiM0urMgpqHD28PHyD05IzSytqr/e0ZOZl9d4vcUrMNzRzS84PLq5tW3vC7ntFyYLx/R8bz+/uGZoeOL+g2dvoNT6+a/vf/756M1bKGYBIfjA3t7B/v7LZ8+2Hz16cv/hEygDHt6/D+XCzaGB3tbmtvqaazWV9VVQalbUlpfXVlQ2VlXXlVVWFBSVZeUUpyZXZ6RFujt0VVd2NrX0Q2vcO9jZNXCtuaum8XrtCdbS0srCguL0tAwYq6pqq2oaKmsasvKLUzILImJSbRzdnD28YxJS8koqGlo7rrW1V9XV55WUW9m5RcUmJYBs794H2X48n38hvjDZd+/erd99kFdYC13s4yfPXwPR9x+A76vXx9Am3X9ILq0O9g93XxyAw95ZXr7R29NSX1dTUVFWVFZUWJ6bX5aUkR+Wku0Xn+EVleYZkeodneEbk+UZkeEWnOoWlOTln+AXGBMYHJ2elJOWkJEUHZcY5J8dE1VfWtR6vam+obm4tCo/vzgjPQOyrLSipLisqLi8sLg8t7AkLTsPZEm0srVzdo2MTcwuKK1uvN7ZP9ja1dvWO0By9IiMSQyLjJlbWH71ivzS2cdT+mfjC5N98+bN6PR8VW3b7Nzy4yfb+weHh0fHh0dvXuwdPIFedW//8PXr59vbawvTA10dtddasisbglNySF6heuZOSF2ikqaBgrqugqaePEpPBqkrraYtidASV8WIKKFFFTGiylhRRayoEkZWQ09dz0KH6KRv52vqHm7tFeXk4utpaZnp79FUlFdSWBYXn5SXW5iXV5SdnZ+VnZ+ZnZ+WmZOSkRWXlOLm7Wvn4hYWHZ+ZV1xeC/VCX9/Q2ODYLTADn6DwsOhY6AlfHR5+PJ9/Ib4w2eM371r7h9u7hmcXVh89fvb8xQEwBR+A9n975zlwf/zg3lBPR+31a4Gp2WoESxEllIw6DqtvbWHl6eQS4OYZ4Obh5+jkaWZhr6NvoqqhJSGnwicsycErxM4txMbFz8IpwMzJy8rBz8YtwsYrwiYgyyaqzCaDFtG2VrMKINi4ORAMMn2cK/LyM7OKk1IyEpPSyJmclpCSDj+mpmcD3IDQ8Kj4ZCBbUlUPaDt7hkYmpkNjE6wcXRPSM6HdPnj5Bd6o8IXJvnz1uql7cGiUfJ118/6jh0+2YWm6++Dxxt37e/v799fXOpuayxpbDZ39ZDUIBKKzv390Wmp+cXFtTXVzfUMrrDYl5TXJGXlQdNo6e+kZmSuT4aqKSCkIicsJissKiskIiMrwCklwcAsxsnBSUTFeuEh1/jLtZWYuOkFZFhWckoW3obmdv5VFSVpKfHxKdExiTGxibFxSXEJyAiBOSY9JSAZhRscnpWXl5pdUVNQ01tY3j4xP5RaVG5iYV9Y33ZyYerG7+825AbhofXv/+OTi7PLayvrm6sbduYWV2YXlwZGxjfU7ZZX1iUU1hvZelraecTEZ1VXNUPMODt7u6xtra++ta2guLKmEIgkKTid3PyMzG02svowiUlRSXlhcll9YildQkktAjItflI1bkJmDj56Zi5qW6dIVuouXac5fvHr+/JVLVAz0/FIiOiRNUwdrPa2M6JiIyMTIqLjo6PhY4BufFB2bGBIW5RMQ5OHt5xMQnJickZ6ZP3zjFpSJ+YXlTq5e5dX1E1NzX6Q8+JJkoUfYfrHf0DEwObM6t7oxv7Q2s7gyM7+UnpnbN3gjp+oa0TtCXAVlYGQZG5dWWdPY1NzR1t7T2tbTeK21vLI2v6g0OTUzNCLG1dPPxNIWrYtXQGiIySgIikvzi0pxCYhy8AixcAswsfPQsnDQMbJR0TBdukpz4RL1+UtU5y9dhfHCxSvnL16hYuHmQxkq6hjb6eslxSaGhkcD3JiYhKjo+JDwKN+AYFsHF3NLUmR0QlZ2cW/f6Mbmw5a2npT0HNBxbEJKU3MLVITfFlmw0afP9+tb+6bm1hfW7qys3xuZmGzv7PILjGwZnpDVItCzcotJKFpZu8TEwVwsLCmvqqisLauoKSwqy8zOg9kaHBrl6u5jammL1SMoqmlKyCkJScjwiUhwCYqy8QoycZCZUjOyXqZjukLNAGoFoOcuXoE8e+EyJGxQ+NKw8fKijFU0saFeHuERMeHh0VFRcWHh0YEh4c5ungRjoq4ewd7BJSUlc3V18/bkfG5BWXZOcX5Bma29S2hY5NbWs2+O7KPtvbqW/un5jfX7j+sb20fGxommFlV1HXaeEecuXuXhEURq6Ng5ugcER8bEJ4NC09KzYFVJTsuMiUsKDo109/K1INnqGBipamIl5ZU/YhUQ4eARYGHnYWDmoGVku0rLcImK9sJlapAnhemZ85cgKRvnL1y5eOnqBdhDWE4Kb22qbxABQIPCgoLD/QNDvHwDrW0dUBisq7unkYlZaVnV2vq92rrmpKTMgsJyopl1TFwylGjDwzfeHL/5eFb/bHxJssfHx492QLODcyv32roG+npvpManaOPwHYO3OPkV6OmYpWWUtXTwJBsnV3df34BQUGhoWDQYX3BYJExSF3cvS2s7nIEhYJVWQghLylGwsvEIsHKQsYID0NCxXKEGY6U6+1GnV4DmT+cu/Xjuwukz5PzpzIUz5y6dOXP+KisPrw5RHaPv5+Xr5ePv5e3v6e3n6OpuYmamrYPz8PSxtXPsHxgdGroZFZ0QEhLt7x+qizPMzS+PT0xPT89++fJfLWm/NNnnr2raBqYW12obW9dX7hjrGYZExGWXX7tAzcUvLC2rgERr4Y2JVjZ2zk6uHq4e3pAAFLZJ9o7GliQdvLEaSktGCSEiJccnSlGrICsHLwMzOz0TKy09Cy0d4+UrVyEvXAJLvXTm4sWz5y/+ePbcKcgfyXn6x/M//gR8z527TM0gqyGPt7EwNgOFOjm7Ojo5W5KsDfAELR0Dfbypr18QNIp5+WWOTm4enr44fUMbB/eo6NT0jKLY2KSlxSVYNj6e2D8VX5jsw2d7zb03r3f23r33aHJiGqmMqG3uJLlFXLjKLCypICWrqq6po4c3MTEjWZDsLK1sLM0szUzNDY2JegQTlA5OGYkGrLBq8YtCGUBRKy9UVzT0zFR0jLQMzFcvXKZiYDjz/amLl69eALKXLvx49swPZ85+/9NPp06d+f6Hn74/debU6bOnfzrz049nqXglRfRtsWgdZxd3Gzt7K2sbE6IZBoNFoXVlFVSCQyKuNbX5+YcSza1gBylZJXffsMTkvLS0wsbG1uHh4df/Wr/wpX12Z7d94HZn//DR0XFbS5e9vUtd+w0tU59Ll+mFxORExGUVVZAoLT1wUh09AyMHV/uaBpPYeKQmFqGGUlBSl5RTFpGWFxCT4hESgyWLkWwC7ACUmpaRhpaR+sIFcU9f1OqmdkHB2f/9FyD708VzQPbUj6d/OHXqL9+f+s/vTn33/U/A9xTc9P0pMARODYIiAuvk6GppZU0kmhkZGSPU1eUVEIJC4tAu5OYVkWzsjYyJdvZOAqJSfqGx0XGZaRnF5ZX1Pb19r/61fuFLkn3//v2zvZeDN+an55ZevXqdlV0Ym5yRmFuNJLhepWLgF5LkFxKXklVURmgiUVg1FFozLU1n90B7clLVzlZCTFqC3A5I8wqLc59UAoCVlpmdBnRKQ08mS81AS0Ors7apsPgIv7/Hws154ezZ8xfO/XTupxOMP5yQ/eE/v/sR4JLJ/nD6Eg0zm7yOnCbe2tzK3NzSyMiEQDBSVkWISchxcQt4ePpBkWtAMNYzMITf8onI+AXHJCTmhIYnZeaU9PcPHr76ZjQL8fjp88aWgfFb0w8ebPkFhIVEJrkGJSJ0HOjo2PiFpPiEJKGDEpOWl5NTlkMgFfNykS92MXfvy/v4CfAKC4lI8giKcfAJsfII0LNz0zGx0dCznKiViZqWgQrKV04Ow8cPVO/cxRzsCKJVz/xw6vxFIPvj6Z/ABMiahfzuh1M/nPrx1A9nfgT3vUhNJ6ImhzU3w5uQSHbgQXggq6LKLyTKzMEDxurk5IbUQKOx2gQDAy4+MUf3ICAbHpmUnJ490D/06tW/dBX8C5M9fvuutKq1ubmru3vY3tHe1snd2iNCRdueBZp8CQVYxPiEpfhFJUTEJEXkFOVzc9G7+9qPH8sFBXBx8/HyC3PyCrJw8TGwc9Mws1PTs1DRkn3gJOmpqWlpmZmsNu8Z3nukdbgjYqR96rvvLl46f/bsTz+dPXOarFHgexrgAtnTp8+e/fH8+bMXaQTlJLBmxrp4W1tHExMiLF/KCAS/sBgLB686Ek0kWigqqaqB96PRDCw8JiTXuITM6Ni05LSC9raub0uzx2/e9AyNpmcV5RdXk6yttHB6JLdwdQNnTl5h6FMFRaX5hCRgdRIQERUQl5BLTcLu7eN3tpVCglnZODi5+VjYuRmhv2JgoaFjpKJluExNe5WaHhyWjpaBjpqOipbWcm3T+O591NG2pJPZmf/47sLFs+fOnTlHpgueQCb7PZD94cdTp87+ePrc2R/PUfHJCGOs9LE4Ozt7ExMTPN5ATR0pKCLFysmnpqaJQWlBvYJAaurp6NDSs+sakQJC4yNi0lLSihoaWl68eAGFFyU+nt4/El+a7PHx0sY9H7+w6OhkCwsLJVUE0SUEYejCJyiugtQWkpAD2XILiPAKCPLwC8pERWq/eKG/80whPIiZhYWFnetkvWIBY4WilZJUYLI0DFeuUoMbXLpw0Wx9TfvJA9TrpyJBLhf/439fAK899xP535kTsj+QycJ46oefyLI9fZaGW5pP3Qyjgba1sSUYGuJwuqoINX4hCdCsvIIyQklNVlZRVV2DaGLKwMSOxhHdvKG7TouLz8nLL6murXv+/AXlTQj/RAX2hcm+ffv26fYLB0cvqMMtLa2VlZTMnIPQZp7c/JKqSJywuCy3ANlJuXgFODm4pAP9tLafae/uyMRGMDKzMjBAxcpMTcd4lYbhF7j0V6lpL16+cunilatXqC6dPaO7uqD+4gH6eEc0Iejif/x/5y+cPXf+DMSpU6dOnz79w/fff/ef33/3lx+++wEMAZa2s1c5xLkQpkiEpq2VtSHBSBenh1BH8giKMLBwyMjIE/QMtbRxGG1dewcnMXFphLaRtYNnUHh8fHKOvDJSXEHRwzdseW2d8q66fxTuFyYLsX/wMiQ4GlZhJ0cXGWkpI2tvvEMkM7uwsroOv7AUJ68IOw8/KxcPMzOLmJsL5sljrZcHMmnJ9OycNDQMVLSAFWiS1XqZihbIQqt6DlqCC9AeUF0+fRo5O66+/1DzaEusMP4SaBaKg3NgBmQ3+OnMGfL4E2yDjC9euHj16kUqBj45DlUThBLSztrWxNhUV09fE40WEBZjYueVkJQ3M7EwIVrg9Ah29s6aKKy4ItLKzhOJMTAgkjwCoonOHsJSsuYenlMzcxSyEB9P8jPiy5OFqra1fUAbp+fvH6ykII/SszTzSqZm5JVTQfEKSbJzCTCzcTEys9HR0ApYmWturmIOD2Tzcph4+WnBTxmY6BhgZAbxQtLQMVFT0UPS0NAz0DPRX7ysOtGDfPVY4+Uj2Wv5V77/nuoqJWiuXKa6cOnShUuXAej5C1fOnb96+TIt1WUaRiEFLqSZmoqmo72DuZkFHk/Q0dGVklEUEJPjF5HE6ugRjEyh/8Ybmdk5ulLTM+oRzB1d/Vz9QmfnFg4ODkrKKxU0MKZeAZv37/+jbvvlycLUefrsuaGFjadvoI6OloIqxtI7gYqJV1BEhpVLiJ6JE5yUjOwyFY8BXn1uBvVqV66siEtCio2Zg42di4WNg4WNkwnaWUayOdDTszDQszAyMrMws7HS0MkPXNd49VR996FCfw31qdN0tGToUDZcuUJ90u9ePn/h6vmLVy9dpqWhYaKjZmAVU+XHkFDqGDcnV2uSDbk8MCCoIjTEpZV5haUkZZW0dPUx2vqaGF0XLz8lhAYtPSsWRywsLj86In9Zyrt373r6BhS0dN0io3ZOFjTKOX5OfHmyEK+PjovL64mWjtBQyiooGbqEcYqo8PKKsHHwM7FwsbBwsHFwcbBzCevjVcdGUIf7sg1VHLIyzAxMgJWZlZ2JmY2BkRUqBIpyyXwZWJlYOFivUstUF2u+3FJ9eldpvOPSdz8AWVpaeipyCUFz+SrtpcvAl+riZWrYhnWPno6JVVxDCGOjg8Z6uHnY2zlYWlpBv6Cloy8mJc8rBBWCoIwCQgmhKa+sjsToePkFa+GM+ISkahqadp4/p8z9d+/eN7W0C6siimsbYTpSTvBz4quQfff+/ZNnz4kkNwcnN0VFBQ1TZ2ksSUJERlYWISQsJSgkKigsJiQoIoLUVGyoR788kL/exCmvwEQHyxg7wGViYWdkYqNnYKGjZwa+MDIwsQFZtqt0Er4e6O0Hag/WleuKzv/lLzTUoE16GjoGGjpQLgOUaID10hWaK1dpaWkY6elYmCSQohiSgRbOzcUNyJJI1iam5tB0ycorMrJyMLLzMrAJ84vIyasglRBoNU1dkp1rcnquf1j0tWtNz55tU05nb38/MD5JSU//0eMnny/br0IW4ujouKPvhk9wmJGpqTxaH+UQwcUtpKGhKyGpICQqISgiLiwiLiIsLuPkqjY8KBEbySrAz8TIzMzKeZIc4AYUuDCCfmGEG9lZ2TnYWJVyUtVbqjn5+a5euEhNQwel7glZBmpyq8ZIBeUEFR0kLQ0DAxMnozRWEm1CxBu4ODnZ2dpZW9uYEs2xWrqS0vKCIhJ0LLyX6AV5hBE4PIlgbEswsXV0DUhMyY5PTAsMiuzs6oYiEs4Fyq6Z+SWkMam8tuHz34rwtcjCVNp/+Wr01mxZdZ2tqzfWOZaFTxalqSUnpyIqISUEWEUkxCGFxYVkZbiEBFhZ2MBef0lwWy4QKQD9SJYR3ICNhZWDg4Wd6eIlqrM/Ul++REfLBFbwCVlytwYOTr52Q8NATU1Hxy7AKKMtrYyyI1k6OjgAWSsrki5OX0JKVkJKjl9InIZZRFxJD2/m6uQRZuvoGxKeEBgal5KWF5+YHhObEhoWuby8DCUX6PTZznMLn3Brd6/Dw8/9bpqvQpZSWoP9Hx2/mV1cKa+sxjsESWBIEhLSsHpISsuJikmJn6SYsIQwv7AArxAvryD0YBxcPBxc3Gwc3KycPKwc3KBfwEpOWMQYWJmZ2FlZ2NlY2ZiZwXmZ6OgYyL3Zb8ky0kIVAR5Cx0TLLc2pZIRQUXdysLezA8Fa43B6YuKSgsKi/PwiNAw8cgiCsYW7o5u/m2+IjJK6maVtZk5hakZeVGxSVExSeHR8Y3Mz5erB89095/BkjInFwcHnXgD7Wpql+NHbt++2tnfa2tp8gyPRtmE8AlKamlh5BVVpaXkpKTkJCRlRUUlhIXEhcF5BEX4BYV5+IS4ePnYuXjJZdm7wBDDZjxUCOAMjGS4TEzMjIxM9PSMkYCWvYOQ+7eR6GNAEUyZrnI2OhYdRHCWsokvQ07Wzt7MmkXC6ODExCR5efi5uPmp6DgkFrL6RjY2Dd1BYnJwyUkpeWU1TKzk9Jzo2KTA0MjgsOiQqNjUnd+sZ+TWx3b1977hsQ0vbvYPP/QaVr0UWgqzcn39+dXi4sLBYWFRi6hSuoG0rL4dAa+ooKarJySpJScqJi8kICYsLCIqcpCjA5eYR4ODiA7IgWIrV/lohgHIpFRg4KAgWyFLTwsDMxsHDxs7DwsbDwsrNysbFyspJz8jBKqHOhzCSl1OxIVmRrKxwOjhxMQleXn5OTj4qOnZBSQRax9jA0DwgNEZVQxvqAVkFVQQS4+lPfoXOPzjMyt7R3Nbewyego6cXJt/88irBDlaN6P3P/m6ar0sWAix/98XuzbFbwWFJeJcoSWUdJAKL0tRVAplIKYiKSouISoE5CIvCJBXjA7K8gmTNcnCRyUJVS6kQThKUS07ASk9JqHLZpWTkUWgdpIaWvDxSVEyOm1uAiZmTSxIhoG4gKq1ogsebEYlaWtqSktICAsIcnLy0jFzCUqpItD4ao+/iGYjS1ufkFRKWkFNQQWpgcBYkh8zcAr/AUFEJGRFJGYKplZuXX//wqFdgpJQSurSy5vMLr69IFoIs2w8fYIV98WKvqbnNyi3E0ClcEWmopqajroHVROug0LpYLX0dHbwKQlNYTIpPUISLV4CDm4+Vg4eRBchyQFLqBJjjJxUueb5TLALmvqKSmp6BkT7eWBdnoKSE4OEVYueX5FHQ4lczEJaU10KhDAmGKiqqYmKwZkqwc/LTs/JJKmiiMHqaKF1n9wAc3oSVk5eTT1hUSkFBVROtTTAwJBYUlVuSHDi4BITEpDQxOB09Ay1DcwEpNXvPwOWVNYpcPp7e78bXJQtBORSIp0+3svNLrT0jjVxi1fSd0XhrgrGVg52rtbWToZG5gpI6F58wnCQ3vwgXH/ktXKyc/KwcfGwcfECE7LmsnORqgZmDgZkdylvo0OjoWdTVUVpYLYQqQkpaXkASwa+ky6tmKIw0EpdSQKuTP18jIiLOwysIxFk5+Dl4xJXVcRgtAyxWz8nJ28UvXFULzy0kziMoJiopL6+igQSO+oaRsfFGxhYs7DySsooy8ioYbR1xJZSLT3j/zfH3/8iHm746WQjK0UAzs3HnfnJGsbNPnGNIjp5jJMEh1Mo1DGdiL62owcLOd5magZYRDFZIQERKQESaX1iKT0iCl18UkotHiIObn5OLnEAZFijyCw00oGZ+CQWkPNZYEmvBp24uijKX19BXkkdoa2IRKkg+HgFol8kFMhuvkKicuiZODamticJ5eAampGZYuQYRXaOFZdQ5eIWFxWWl5VVVkFpobT1HVw8LKzt2Ln5peRWoeaHldfINmJ1fArf9TKaU+CPIQsAxffjw89HRm4WlO7l51ZFRmUFR2U5BqQTXcC3HQA2StwyOxKukzSqqxCYsyyOmyCuiyCkgxc4jzMbJz8zKx8DCxcDKy8ItyiYkyymuzCWL5FPWFsaacKsTuFUJAkhTOW1LNS1jhIoGBoHGoLRlZRSh5ODihvty8QlIKyhjEUisuLi0uKQCyc4jKTEjKSHJwsHL0iNGSFqNBboOYUlRaTAEtCZWF29C9A0MhnZGXFpOUERSTQM7NDpKaRm+WbLkS8iHh0dz8+s11W3pKbnengGOrn62PqFEtxCMmZsCjiSpZSGhbSGtbytt6CJi6Cygb8+Ps+bGWnBjzfi0rIRwNoK6toJalvxooqCGkZSOuSrBFmfsqI0zA5poJAajqa0gryosJMHHL8LNJyIqrqiipq2mgZNXVOMG++YUwGgZOTq6Ey2sEWgDUXmUspaxlCqGR0iCk09UUExGVlEdidYG2cYlJOvhjaTlFRWU1U0trPsHRv4hppT4g8hCwMFR4vD18ezcan5+WUxUXLB/sIeLp6ONs4UpyZBgjjci4QytjCxdTVwCtex9lInOcngbaX1LOX1rFYIdytQRa+yIMbTVMrDS0THV1zY01Dcx1DPRxxmiMbrSsopQuoFdcHOLSEojUFhDrLahiioKpjo7dCC8QgqK6lpoHUVFJWZBOSouWV4xNQTGWJ/ogDO0EJdR4RGUkJAD0WM1sDj/4PC0rDxrOzdvv9Dg0Gh7BzdoxigXaD4//miysAGGtbyyXl5el51VFBuTEhkeFxYU4enmbUOyI7+rA8p3c1sPV28Ql4WlnbGxJR5PNNA3MdAzweuZ4vWIerpGurqGenomOJwxVhuHUENKSsny8QvDQscvIKGkhNLBmWJ1jRFqGCjm2Ni4OLl4YX0D2aooqogIClxmErjMLs8rqkIuvLSNtAk2+qZ2KF0TBMYALFtRHaOpg7d19Ki71hoekeDg6GpibC4tIwdF8fHJdcXPjz+aLLThh4fHi0sbRWW1SRmFZRXXCotq4+MzAwIjvbyDPL0CvbyCfP3C4UcYPbwCHZw8rW2dLa3sTIkkvJG5noEJCqsD3ZKsIkJMUo5XQIRPQExUTEFRSVMbKn+8uZY2XllFXURckp2Dm52DR1RcWllVHYHQgJpMWEj4MgP3OTYFNgEFJWV1DQ0MVGMcgtKqWGMs3krP1B5PtFZF6aJ0jU0s7AuLK2VlFWXlFKAERqOx/Hw8z3d2Pp7J58VXJ0sBChvvP3w4On7zfPdgZePB9Oxa343J9MK6hKSsuPj0zKzSwuLavPyq5JT8oJB4BydfUzN7gpGFPsFEB0dAYXEaKG0EEq2oipRVUJOUVZVRQCqpYjUxeJw+0YQIuibh9IzVkZiTN79IsXPw8wmIy8qrKCM0VNU1kZoYZWU1WWk5Zg6Bc2xyDIIqUGEhERoIVQ0NpJaIuAKnkKwa1ljLwBJPtDUyd8DqmWH1zbJzS8FChEXEWdi4PL38fHz9Dv/Btx98RbIUppSA1evw9dHTZ89n5paHx6YaWnuGJqbzarpTcmsrSqt8fcJg7nt7+4eHx0ZFJ8fEpkbHJEdEJASGRHv7hLp5Bri4+7h4+Lp6+ju6+Fo7eFmQnAxNSTgDU3V1tLy8KjgsNHI8/MICwlJyCihNNF5NQ1dOQU1ZRUMDpaWkAhvq0GZdYZW4wqchJqeBQqKQapqaGlpgKRYWjlJKGEFZDSgtNHRMMfoWeiZ2KBwxMjZNRl5RXl7Z2NQiISWzuq5+/x/8NtuvTpY8/Y+O1zbv3xi/PTZ+e3FhdWZyvqruWmXdtfTS1rj8tuHh26XFFaEhsV6ewZ6eAR4e/i6u3rZ2zpbkt9TZWVpC2ppbkswsSUQzSz19Q4Q6Sk5eBbpPIVFyTwwdrbyCOgqljzck4gxM1DS0JKWVRCXkJWUUNFAYdQ20GhKloqrGzid6gVOJTQJD/goUbV0MRlsXZ0gwsnRy8bN18lPVMtTBW9g4eDl7BvmExHr4R7r7RQDQwMAQjLaepbV9RFTM9s7HVxk+M74wWUD5cetk++Wrwxvj8+VldSvjY5OTM01tfdebe5YW1gf6BguKS5IKqwLSG5o6xgb7+nKz81OSc8PDEr29Q9zc/ZxdPB0c3WztXEjWDhYWNgaGpto4gjbOCKtD0MToozAGKC09XagK8Ca6OBOwAl1dgooqUkpOSVJeRV5JU1RSTkkVoYnBQierra2roqrKyCd+SQAlrqJnaGgCSTAkEi0crO28PL1D/dx9bIzwxpoIgpqSIVrdyojg5+kbm5aZkJbT1t4jJEo2BP+AkDubd/+cV2tOBEoO2IbVH0rro6O3Dx7tlNV0JKUXXi/MWumoGOrpLa9rb2juunV7qrq2LjmvyDupMqes69b4RGlJcUF+cW1Nc1lZfVpafkREnI9PkLOzp5mFjbGxGdHczNjUzIBgCihxeoY6OgYYtA50oyg0Fqulq6WN09LCKSmpS8goItB6SqqaapogSh2kJvxeS1/fQAWhRscvRy2qq6JpSLK0JVnZOzp5evpGBAZG2JuZq8tIiXDzcrNyC/AKS4rLyEnKSIqI4bQxiSkZ0I4bmZoj1DUjo+MfPdmi/I9DlHP8f8aXIUthSok3b9/OL2zcur14e3p5cnp9YPhWa8dQfm5RSVzI4rXcjqaWvOLa+qb28sqamJR0+6CM+KzG6dvTnZ0dWVlZ1TUNXd0DLa099fWthUVVSSk5wRExhkQ7HjF9rI6Zu4e3p5evo7ObvYOzjbWDKdHS0MRMj2CspYvXxOjIyCspILVVMQSMFs6YaG5oZALQQbL6BoaKqupUAips8kY4vKWjvbOnVwBUe7HRaU5OvjgCSUHDSBlt4uLuHxoS4eHp4+ToBtMFb2CorKKWkpYdEhZlbEpUR6KSktJ2X5C/hJlympQT/534AmThYSgGBBsPt3Yam3v6hmDqr42Nz/X03Whq7i6raKyouZ6akZHsQZosjqgsLI5MSI9PTHPxC1U08QlMqLk9MTs0NNJ4rTErO7ets3doeKKja/Da9a7yymtNza2m9omsMtlYs5SouDTf4Ggv/yAbR2cXL7/AsGh3X38PH39HNy9DE3NVbT15DZw21P2WNmYWlqZmlgYEYyCLw+nLqSCvCmnwIcyJFo5BgRF5+RW1da2lZfVR0Wmxsekx8VnOnpGa2hYOjn452XnJyRlh4TGhodH+AUFKKojq6iY2dk4aOkaEOhrU8Bbm4+d9+d+/SvZXrG/fvR8emx0anb55e7F/bGJo7HZ792B9Y0deUVV8YnpcYlpKWo6Xu0+AMbI5xiUkINLbN8TB3U9c39U6sHB4aHJ6emZwcKC+4Vpv/42pmeWRG7fHbk6NTNxKSk3u6x+fmn+8svZwaXF15OZUUWkd0dpeWEoaZ2QSEh3nHRDi7R/kHhSmhDHQ1sNbkWyMiRZEC5KpuZWJmaUuzgCDwsqqoM4JYNSMfEtL6/sHx643dxYVVQQHR4aFxWZkFGRnl6Sl5cbGJmnjrXB4M/JnSnMKMzPzS8sq3Nw9UCjMZSo6EQlphAaWlYM7OTVjbW2dchnh9+PLuMGb4+Pr3cNF5XXRsUk1ddca2zqKKmsr65oKimoSYEaHRfsHhoXAGBqD09UPJCDSfcmvknr6BGtY+ug6J3d1ja0ur9yenOztHywoqsrNLyurqHVydi+vbYyIiRsbvXF/8871xgZXTw9PL5fenqHSqmt6BFMpRSVdgom1g6tPUJgGRgdvZBoVHQuruY29E5ijqbk1wCUYEzFYbUFZNZxzVFPPVHf3cENjS0Njc1pyRmxMIrQDGZkFiUkZqWk5yamZ8cmpKOhEdPVg4icmpuXk5JdXVMrJyTOxcUvJIwyJ1gxsPEqq6NTUjM9Zyr4M2dae/szC4uKyyoGhsdKyOpKtE1rbwMbeOTwqPjouJTg00h/WCkd3cxs7UxsXdVnFaEttX3c3dy9/Q3tvtGVkfd3QxsrG/NzC0PAo+UVpaM5KqoyIFgWllXFJKUN9vT3NDQZ23poO0bQ8oro4ncHRCU2Mgb6RMaxUPgFRyhq65pbW0VExoWERYeHkD+u4uHkSTIjGREsDY3Ogn5ZTMDm73NY+UFPTkptbkgtOX3O9orwhL7+kpKwyKTUrNj41ISU9NiE1LiFZSErVzs4pKDQiMjquuLTSzMySgYVHRlGNYGotLKMiJYcoKiihvIPm9+MLkN3eeZGUVbi+cffO2oOB/rG4uJSh4XF3Lz+0tr4x0crLNyg8Mg4o443MbJ3cbd28NHUIRIxmhIuVg6uvuZ07wsA1u6BlfXljdnZ+ZGQ0J78kLjG9sKQSq0fIK62MjE8aHejLyc6XtYxUsk+WNnC9SMUSl5VtZOWExukjUFoIpB7R0sk3IDgkJCQ4NAyexdCwqNDQKCcXd5yBEcHUMiohNSI6WU5eHY3RNzEhhUXEF5dUFRSU5eQUJSSmxscnZ2blR8YkgggioxMDQyNcPLxFpNX8g0IDg8Ni4pJAy1dpmKGYQ2kRFNQwYeFR29vb4IFf0WcpfxpM9vnBwfHx24X59e7uQVcX7+XlO8OjY1CyWJCcUVgDc0sHgom5k5t3YGhUQHCEp1+wAdFWWRHpa2XoaW9nQXKRVjUKiy5YXdqYmQayY0WlleFRCSdfrBVeWFweERc/0N9TVlEnZ5sqZ5+LdEy8RMdh6xtk4eqJ1NLl4BPWJ69YTs5uXj7+AX4BQX7+wf4Bwb4BAZ7+AZa29kZmJBsHTxs7z6ysktT03NT0nKy84vDohDjyl6bGALvgkLDwiKio6ITA4Ei/gDAXqG+jYsRlVMFSAoLC4cacvGIhMWkeQXERCQUjc7vx8dvQ+/x6+r8T/ypZiBev3szM3hkZmUpNLRgZunXz5hRMJLyRMcHY1MDQBKOjp6Nv5Obl7x8S6eUT5OLhY2xuLaeGM8BquxlhTYxMhWWwrt6J87NLszNzw4MjJSU1MfFpxaVV/gGBfn6BIVExLe0tI/1d6lZREvY5PMpaXEIS/glpHqGRahgtcVlFjA48iIW1PcD1cPPw8vD09fCCPtjTycPDys4RnsvOzsHenrFr17rAYWGOW5DsgkOjLW3svf38fX0D3D18AoOCw8keEmtl4+Tq7RcYHoXV0dPE4L38wnwDo2ITMrx9gyRlVfUI5sGRiTfGbh1+3qeZ/lU3uLdzMDgx39072tDQcWNscnnlTlFxOUpLGxbT2OQs3+AwBSVVoqW1iYWNu0+gg6untYMLwcxaWRMvLqtqgFY1wmHFFHC2LlEjI+O3bk329Q3mF5VHxKT6+IVooNHevn5evgFVjc3dHX011bUmZo5yKqr2Xr7xSeneYZHnLl45c+6SpIwiVKwkazsXV3eg6+jk4uTiauPgaO/iVtN4ffPukxujU4MD4/19ox2dvW3t3fmFJWYWJALRRg2j5+Ds6uTq5uzu4R8cYuPgBI8FT6V/QKiVta2IpJKjq59vYKS7V3B8amZyeq5fWExMasb4ybs/P57878Y/TxYmxavXP49Obd59uvP02bO1jc2RGzfLyqtgFsP0F5VRmJhZGRq/5e4XgDc0MTAkOrt7W9k6GRGtsPom8uo63BIKCqoqBLxOYUnZ5MzS9MzsyOhIe3tXeUVtTn5FWlpOZUVFQUGui7NTWk7Z2p17HS0dXZ19I8Pjg1Dujo4rI5AMzCwOzi7Obp6GRqY4PQM0FmNsauzg6ARwXT08Wzu61zbuDw/fHBoY7enqb23ubKi/XlZWlZNbGBOTgNM3IhBtoXGwsnEFFYNywyJjQNH+waGgWrg/F7+4uZ2HV0CUqgYuNiEFrMzdPyQ+PQvIPnn69COC341/nixUHncf73YMDHf0DREIhkHBwTdv3/by8yM5OOrgTYSl5Kua2nv6b3gEBhlZWMKcJauVaAn9PgKlK6Oqzc4vjcHhm5qb4e+8Pjp++nSrrq6uobHe1T+O5Bpi6+pDtLYKDgSLtE6Pi020swr09ikrzK8uL62qqmxpbdUzwDNxcLl6+kTGxMcnpSampCcmJTm7uGK1dc3MSXMLy3OLK10n35DW2dnb0tIBWMvLq6FWTYXqKj7Zxs4Jb0wiOXpBLWVJsvf08gsOjfIPDPfxDwayDs5ubHxS9h4hBoY2CqraMXHxPkHBbn5B0cmZtxdWn25tfUTwu/FPkoWFa3JqxiswNL+kprNnzNsneHp6tr29MyU9x9jMioOHi42LJzo1vX94ws7d05RkQ64TLGw0dPQV1FCwwkqroc0dHMbGx6GfeXV4uLZxp6y8IjAgEFogh6Ck6PTA2BgbSydvNbSvoY1vhTNhUIcbraQaH5/g6elmaEysqKw2J9leukqtjdN38/Ty8PaD2iA0PDw2LqGoqHh4ZKy0tLKhobkbGuW2rsZrLbW11yrKa/ILSlLTsqKj4wMCQnz9gjW1CLYuvnBYZpZ2duAlbt7gsu5evv6BwVp6BAOiU2h0xhUqdrypPXhtQGg4kI1KTBscm/ysz4n99a//B4T8/hTry1IyAAAAAElFTkSuQmCC";
		//#endregion
		//#region styles
		const CSS = `
.wb-hero{display:flex;flex-direction:column;align-items:center}
.wb-hero-title{margin:10px 0 24px;color:var(--dsw-alias-label-primary);font-size:38px;font-weight:700;line-height:1.25;letter-spacing:.3px;text-align:center}
.wb-hero-tabs{display:flex;align-items:center;gap:4px;background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;padding:3px;margin-bottom:34px}
.wb-hero-tab{display:inline-flex;align-items:center;gap:7px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:999px;padding:7px 16px;font-size:14px;font-weight:500;line-height:20px;transition:background-color .15s ease,color .15s ease}
.wb-hero-tab:hover{color:var(--dsw-alias-label-primary)}
.wb-hero-tab[data-active="true"]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base);font-weight:600}
.wb-hero-tab[data-active="true"]:hover{color:var(--dsw-alias-bg-base)}
.wb-hero-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:660px}
.wb-hero-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:999px;padding:8px 16px;font-size:14px;line-height:20px;transition:background-color .15s ease,color .15s ease,border-color .15s ease}
.wb-hero-chip:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover)}
.wb-hero-mascot{position:absolute;right:10px;top:0;width:115px;height:102px;transform:translateY(-97%);background:url("${MASCOT_URL}") center bottom/contain no-repeat;pointer-events:none}
[data-composer-placeholder]{font-size:0}
[data-composer-placeholder]::after{content:"${PLACEHOLDER_TEXT}";font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px));white-space:pre-wrap}
[class*="cardWorkspaceTrigger"] [data-composer-placeholder]{font-size:inherit}
[class*="cardWorkspaceTrigger"] [data-composer-placeholder]::after{content:none}
`;
		function injectStyles() {
			if (typeof document === "undefined") return;
			if (document.getElementById("workbuddy-hero-css") !== null) return;
			const tag = document.createElement("style");
			tag.id = "workbuddy-hero-css";
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region bridge
		/** 会话输入动作桥：modeActions 条目把 inputActions 存进来，hero 块在点击时读取。 */
		const bridge = { actions: null };
		function WorkBuddyActionsBridge(props) {
			react.useEffect(() => {
				bridge.actions = props?.inputActions ?? null;
				return () => {
					bridge.actions = null;
				};
			});
			return null;
		}
		//#endregion
		//#region hero block
		function HeroBlock() {
			const [active, setActive] = react.useState("code");
			const tab = TABS.find((entry) => entry.id === active) ?? TABS[1];
			const pick = (chip) => {
				try {
					bridge.actions?.setDraft(chip.prompt);
					const editable = document.querySelector('[data-composer-card] [contenteditable="true"]');
					editable?.focus();
				} catch {}
			};
			return h("div", { className: "wb-hero" },
				h("h1", { className: "wb-hero-title" }, "WorkBuddy, 我帮你"),
				h("div", { className: "wb-hero-tabs", role: "tablist", "aria-label": "场景" },
					TABS.map((entry) => h("button", {
						key: entry.id,
						type: "button",
						className: "wb-hero-tab",
						role: "tab",
						"aria-selected": entry.id === active ? "true" : "false",
						"data-active": entry.id === active ? "true" : "false",
						onClick: () => setActive(entry.id)
					}, h(Icon, { name: entry.icon }), h("span", null, entry.label)))),
				h("div", { className: "wb-hero-chips" },
					tab.chips.map((chip) => h("button", {
						key: chip.label,
						type: "button",
						className: "wb-hero-chip",
						title: chip.prompt,
						onClick: () => pick(chip)
					}, h(Icon, { name: chip.icon }), h("span", null, chip.label))))
			);
		}
		//#endregion
		//#region brand.mark occupant
		/**
		 * 占住 `conversation.hero.brand.mark`（官方构建没人注册，平时渲染鱼 fallback）。
		 * 自身不渲染可见内容：把原 headline 行隐藏，再把 WorkBuddy 欢迎块 portal 到
		 * headline 下面的空 body div；宇航员以 DOM 节点挂到 composer 卡片右上角。
		 */
		function WorkBuddyHeroMark() {
			const mountRef = react.useRef(null);
			const [bodyEl, setBodyEl] = react.useState(null);
			react.useEffect(() => {
				let timer = null;
				let tries = 0;
				const find = () => {
					const hitbox = mountRef.current?.parentElement;
					const headline = hitbox?.parentElement;
					const body = headline?.nextElementSibling;
					return headline && body ? body : null;
				};
				const found = find();
				if (found) {
					setBodyEl(found);
					return undefined;
				}
				timer = setInterval(() => {
					const candidate = find();
					if (candidate || ++tries > 40) {
						clearInterval(timer);
						if (candidate) setBodyEl(candidate);
					}
				}, 50);
				return () => clearInterval(timer);
			}, []);
			react.useEffect(() => {
				if (!bodyEl) return undefined;
				const stack = bodyEl.parentElement;
				const headline = bodyEl.previousElementSibling;
				let mascot = null;
				if (headline && headline.parentElement === stack) {
					headline.dataset.wbHeroHidden = "1";
					headline.style.display = "none";
				}
				/** HeroShell root 的父级 = composerStack；卡片在其内带 data-composer-card。 */
				const composerStack = stack?.parentElement?.parentElement ?? null;
				let tries = 0;
				const attach = () => {
					const card = composerStack?.querySelector("[data-composer-card]") ?? null;
					if (card) {
						mascot = document.createElement("div");
						mascot.className = "wb-hero-mascot";
						card.appendChild(mascot);
						return true;
					}
					return false;
				};
				let retryTimer = null;
				if (!attach()) {
					retryTimer = setInterval(() => {
						if (attach() || ++tries > 40) clearInterval(retryTimer);
					}, 50);
				}
				return () => {
					if (retryTimer) clearInterval(retryTimer);
					if (headline) {
						headline.style.display = "";
						delete headline.dataset.wbHeroHidden;
					}
					if (mascot) mascot.remove();
				};
			}, [bodyEl]);
			return h(react.Fragment, null,
				h("span", { ref: mountRef, style: { display: "none" } }),
				bodyEl ? reactDom.createPortal(h(HeroBlock), bodyEl) : null
			);
		}
		//#endregion
		//#region apply
		/** Required service: the UI slot registry. */
		const inject = ["slots"];
		/**
		 * Client plugin body：brand.mark 换成 WorkBuddy 欢迎块；
		 * modeActions 挂一个不可见条目，拿 session 级 inputActions 供 chips 填稿。
		 * @param ctx - Client root context.
		 */
		function apply(ctx) {
			injectStyles();
			ctx.inject(["slots", "conversation"], (scope) => {
				scope.slots.inject("conversation.hero.brand.mark", () => {
					try {
						return scope.slots.register({ name: "conversation.hero.brand.mark" }, WorkBuddyHeroMark);
					} catch {
						return () => {};
					}
				});
				scope.slots.inject("conversation.hero.modeActions", () => {
					try {
						return scope.slots.register({
							name: "conversation.hero.modeActions",
							id: "workbuddy-hero",
							order: 5
						}, WorkBuddyActionsBridge);
					} catch {
						return () => {};
					}
				});
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
