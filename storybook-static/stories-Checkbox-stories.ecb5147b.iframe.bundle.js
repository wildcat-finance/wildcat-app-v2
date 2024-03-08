"use strict";(self.webpackChunkwildcat_app_v2=self.webpackChunkwildcat_app_v2||[]).push([[208],{"./src/stories/Checkbox.stories.tsx":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.r(__webpack_exports__),__webpack_require__.d(__webpack_exports__,{ThemedCheckbox:()=>ThemedCheckbox,__namedExportsOrder:()=>__namedExportsOrder,default:()=>Checkbox_stories});var react=__webpack_require__("./node_modules/next/dist/compiled/react/index.js"),objectWithoutPropertiesLoose=__webpack_require__("./node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js"),esm_extends=__webpack_require__("./node_modules/@babel/runtime/helpers/esm/extends.js"),clsx=__webpack_require__("./node_modules/clsx/dist/clsx.mjs"),composeClasses=__webpack_require__("./node_modules/@mui/utils/composeClasses/composeClasses.js"),colorManipulator=__webpack_require__("./node_modules/@mui/system/colorManipulator.js"),SwitchBase=__webpack_require__("./node_modules/@mui/material/internal/SwitchBase.js"),createSvgIcon=__webpack_require__("./node_modules/@mui/material/utils/createSvgIcon.js"),jsx_runtime=__webpack_require__("./node_modules/next/dist/compiled/react/jsx-runtime.js");const CheckBoxOutlineBlank=(0,createSvgIcon.A)((0,jsx_runtime.jsx)("path",{d:"M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"}),"CheckBoxOutlineBlank"),CheckBox=(0,createSvgIcon.A)((0,jsx_runtime.jsx)("path",{d:"M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"}),"CheckBox"),IndeterminateCheckBox=(0,createSvgIcon.A)((0,jsx_runtime.jsx)("path",{d:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"}),"IndeterminateCheckBox");var capitalize=__webpack_require__("./node_modules/@mui/material/utils/capitalize.js"),useThemeProps=__webpack_require__("./node_modules/@mui/material/styles/useThemeProps.js"),styled=__webpack_require__("./node_modules/@mui/material/styles/styled.js"),generateUtilityClasses=__webpack_require__("./node_modules/@mui/utils/generateUtilityClasses/generateUtilityClasses.js"),generateUtilityClass=__webpack_require__("./node_modules/@mui/utils/generateUtilityClass/generateUtilityClass.js");function getCheckboxUtilityClass(slot){return(0,generateUtilityClass.Ay)("MuiCheckbox",slot)}const Checkbox_checkboxClasses=(0,generateUtilityClasses.A)("MuiCheckbox",["root","checked","disabled","indeterminate","colorPrimary","colorSecondary","sizeSmall","sizeMedium"]),_excluded=["checkedIcon","color","icon","indeterminate","indeterminateIcon","inputProps","size","className"],CheckboxRoot=(0,styled.Ay)(SwitchBase.A,{shouldForwardProp:prop=>(0,styled.ep)(prop)||"classes"===prop,name:"MuiCheckbox",slot:"Root",overridesResolver:(props,styles)=>{const{ownerState}=props;return[styles.root,ownerState.indeterminate&&styles.indeterminate,styles[`size${(0,capitalize.A)(ownerState.size)}`],"default"!==ownerState.color&&styles[`color${(0,capitalize.A)(ownerState.color)}`]]}})((({theme,ownerState})=>(0,esm_extends.A)({color:(theme.vars||theme).palette.text.secondary},!ownerState.disableRipple&&{"&:hover":{backgroundColor:theme.vars?`rgba(${"default"===ownerState.color?theme.vars.palette.action.activeChannel:theme.vars.palette[ownerState.color].mainChannel} / ${theme.vars.palette.action.hoverOpacity})`:(0,colorManipulator.X4)("default"===ownerState.color?theme.palette.action.active:theme.palette[ownerState.color].main,theme.palette.action.hoverOpacity),"@media (hover: none)":{backgroundColor:"transparent"}}},"default"!==ownerState.color&&{[`&.${Checkbox_checkboxClasses.checked}, &.${Checkbox_checkboxClasses.indeterminate}`]:{color:(theme.vars||theme).palette[ownerState.color].main},[`&.${Checkbox_checkboxClasses.disabled}`]:{color:(theme.vars||theme).palette.action.disabled}}))),defaultCheckedIcon=(0,jsx_runtime.jsx)(CheckBox,{}),defaultIcon=(0,jsx_runtime.jsx)(CheckBoxOutlineBlank,{}),defaultIndeterminateIcon=(0,jsx_runtime.jsx)(IndeterminateCheckBox,{}),Checkbox_Checkbox=react.forwardRef((function Checkbox(inProps,ref){var _icon$props$fontSize,_indeterminateIcon$pr;const props=(0,useThemeProps.A)({props:inProps,name:"MuiCheckbox"}),{checkedIcon=defaultCheckedIcon,color="primary",icon:iconProp=defaultIcon,indeterminate=!1,indeterminateIcon:indeterminateIconProp=defaultIndeterminateIcon,inputProps,size="medium",className}=props,other=(0,objectWithoutPropertiesLoose.A)(props,_excluded),icon=indeterminate?indeterminateIconProp:iconProp,indeterminateIcon=indeterminate?indeterminateIconProp:checkedIcon,ownerState=(0,esm_extends.A)({},props,{color,indeterminate,size}),classes=(ownerState=>{const{classes,indeterminate,color,size}=ownerState,slots={root:["root",indeterminate&&"indeterminate",`color${(0,capitalize.A)(color)}`,`size${(0,capitalize.A)(size)}`]},composedClasses=(0,composeClasses.A)(slots,getCheckboxUtilityClass,classes);return(0,esm_extends.A)({},classes,composedClasses)})(ownerState);return(0,jsx_runtime.jsx)(CheckboxRoot,(0,esm_extends.A)({type:"checkbox",inputProps:(0,esm_extends.A)({"data-indeterminate":indeterminate},inputProps),icon:react.cloneElement(icon,{fontSize:null!=(_icon$props$fontSize=icon.props.fontSize)?_icon$props$fontSize:size}),checkedIcon:react.cloneElement(indeterminateIcon,{fontSize:null!=(_indeterminateIcon$pr=indeterminateIcon.props.fontSize)?_indeterminateIcon$pr:size}),ownerState,ref,className:(0,clsx.A)(classes.root,className)},other,{classes}))}));var Box=__webpack_require__("./node_modules/@mui/material/Box/Box.js"),colors=__webpack_require__("./src/theme/colors.ts"),__jsx=react.createElement,Icon=(0,styled.Ay)("span")({border:"1px solid ".concat(colors.l.iron),borderRadius:"4px",width:14,height:14,padding:"2px",transition:"border 0.2s","input:hover ~ &":{borderColor:colors.l.santasGrey}}),CheckedIcon=(0,styled.Ay)(Icon)({border:"1px solid ".concat(colors.l.blueRibbon),backgroundColor:colors.l.blueRibbon,"&::before":{display:"block",width:14,height:14,backgroundRepeat:"no-repeat",backgroundPosition:"center",backgroundImage:"url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 10.5' fill='none'%3E%3Cpath d='M0.349609 5.43697L1.42915 4.32901L5.17916 8.02219L12.9348 0.294922L14.0428 1.40288L5.17916 10.2381L0.349609 5.43697Z' fill='white'/%3E%3C/svg%3E\")",content:'""'},"input:hover ~ &":{borderColor:colors.l.blueRibbon}}),IconSmall=(0,styled.Ay)("span")({border:"1px solid ".concat(colors.l.iron),borderRadius:"4px",width:12,height:12,padding:"1px",transition:"border 0.2s","input:hover ~ &":{borderColor:colors.l.santasGrey}}),CheckedIconSmall=(0,styled.Ay)(Icon)({border:"1px solid ".concat(colors.l.blueRibbon),backgroundColor:colors.l.blueRibbon,width:10,height:10,"&::before":{display:"block",width:10,height:10,backgroundRepeat:"no-repeat",backgroundPosition:"center",backgroundImage:"url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 10.5' fill='none'%3E%3Cpath d='M0.349609 5.43697L1.42915 4.32901L5.17916 8.02219L12.9348 0.294922L14.0428 1.40288L5.17916 10.2381L0.349609 5.43697Z' fill='white'/%3E%3C/svg%3E\")",content:'""'},"input:hover ~ &":{borderColor:colors.l.blueRibbon}});function _heckbox_Checkbox(props){return"small"===props.size?__jsx(Checkbox_Checkbox,(0,esm_extends.A)({checkedIcon:__jsx(CheckedIconSmall,null),icon:__jsx(IconSmall,null)},props)):__jsx(Checkbox_Checkbox,(0,esm_extends.A)({checkedIcon:__jsx(CheckedIcon,null),icon:__jsx(Icon,null)},props))}try{heckbox.displayName="heckbox",heckbox.__docgenInfo={description:"",displayName:"heckbox",props:{component:{defaultValue:null,description:"",name:"component",required:!1,type:{name:"ElementType<any, keyof IntrinsicElements>"}},ref:{defaultValue:null,description:"",name:"ref",required:!1,type:{name:"((instance: HTMLButtonElement | null) => void) | RefObject<HTMLButtonElement> | null"}}}},"undefined"!=typeof STORYBOOK_REACT_CLASSES&&(STORYBOOK_REACT_CLASSES["src/components/extended/Сheckbox/index.tsx#heckbox"]={docgenInfo:heckbox.__docgenInfo,name:"heckbox",path:"src/components/extended/Сheckbox/index.tsx#heckbox"})}catch(__react_docgen_typescript_loader_error){}var Checkbox_stories_jsx=react.createElement;const Checkbox_stories={title:"Components/Checkbox",component:Checkbox_Checkbox};var ThemedCheckbox=function ThemedCheckbox(){return Checkbox_stories_jsx(Box.A,{sx:{display:"flex",flexDirection:"column",gap:"15px"}},Checkbox_stories_jsx(Box.A,{sx:{display:"flex",flexDirection:"row",alignItems:"center",gap:"10px"}},Checkbox_stories_jsx(_heckbox_Checkbox,{size:"small"}),Checkbox_stories_jsx(_heckbox_Checkbox,null)),Checkbox_stories_jsx(Box.A,{sx:{display:"flex",flexDirection:"row",alignItems:"center",gap:"10px"}},Checkbox_stories_jsx(_heckbox_Checkbox,{size:"small",defaultChecked:!0}),Checkbox_stories_jsx(_heckbox_Checkbox,{defaultChecked:!0})),Checkbox_stories_jsx(Box.A,{sx:{display:"flex",flexDirection:"row",alignItems:"center",gap:"10px"}},Checkbox_stories_jsx(_heckbox_Checkbox,{size:"small",disabled:!0}),Checkbox_stories_jsx(_heckbox_Checkbox,{disabled:!0})))};ThemedCheckbox.displayName="ThemedCheckbox",ThemedCheckbox.parameters={...ThemedCheckbox.parameters,docs:{...ThemedCheckbox.parameters?.docs,source:{originalSource:'() => <Box sx={{\n  display: "flex",\n  flexDirection: "column",\n  gap: "15px"\n}}>\n    <Box sx={{\n    display: "flex",\n    flexDirection: "row",\n    alignItems: "center",\n    gap: "10px"\n  }}>\n      <Checkbox size="small" />\n      <Checkbox />\n    </Box>\n    <Box sx={{\n    display: "flex",\n    flexDirection: "row",\n    alignItems: "center",\n    gap: "10px"\n  }}>\n      <Checkbox size="small" defaultChecked />\n      <Checkbox defaultChecked />\n    </Box>\n    <Box sx={{\n    display: "flex",\n    flexDirection: "row",\n    alignItems: "center",\n    gap: "10px"\n  }}>\n      <Checkbox size="small" disabled />\n      <Checkbox disabled />\n    </Box>\n  </Box>',...ThemedCheckbox.parameters?.docs?.source}}};const __namedExportsOrder=["ThemedCheckbox"]}}]);