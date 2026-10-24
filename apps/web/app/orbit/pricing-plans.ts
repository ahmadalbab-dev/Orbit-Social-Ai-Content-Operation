/** Launch proposal only: this catalogue does not grant access or create a subscription. */
export const pricingPlans = [
 {id:'free',name:'Free',price:0,audience:'Explore at your own pace.',tagline:'A little curiosity goes a long way.',credits:'3 AI trial credits · once per account',generation:'One image OR one video up to 6 seconds, once per account',features:['Basic image and video editing','Device projects and local exports','AI chat with trial credits','One image OR a 6-second video trial'],excluded:['Premium templates','Team invitations'],cta:'Explore Free'},
 {id:'essential',name:'Essential',price:1,audience:'For occasional creators.',tagline:'Your next idea, for one dollar.',credits:'20 AI credits / month',generation:'Video up to 15 seconds per clip; monthly credits apply',features:['Everything in Free','Monthly AI chat and writing credits','Selected image-generation templates','Video generation up to 15 seconds'],excluded:['Full template collection','Team invitations'],cta:'View Essential'},
 {id:'professional',name:'Professional',price:3,audience:'The complete available Orbit toolkit.',tagline:'More room for everything you make.',credits:'60 AI credits / month',generation:'Video up to 15 seconds per clip; monthly credits apply',features:['All available image and video tools','Higher AI chat and generation allowance','Full available template collection','Brand profile and saved destinations'],excluded:['Team invitations'],cta:'View Professional'},
] as const;
export type PricingPlan=typeof pricingPlans[number];
export const pricingComparison=[
 {feature:'Image and video editing',values:['Basic tools','Basic tools','All available tools']},
 {feature:'AI chat and writing',values:['3 trial credits, once','20 credits / month','60 credits / month']},
 {feature:'Generated images',values:['One image OR video trial','Selected templates; credits apply','All available templates; credits apply'],upcoming:true},
 {feature:'Generated video',values:['One clip up to 6s OR image','Up to 15s / clip; credits apply','Up to 15s / clip; credits apply'],upcoming:true},
 {feature:'Templates',values:['Starter','Selected collection','Full available collection']},
 {feature:'Device projects and local export',values:['Included','Included','Included']},
 {feature:'Advanced editor tools and AI planning',values:['Trial AI planning','AI planning within credits','All available tools within credits']},
 {feature:'Workspace members',values:['1 person','1 person','1 person']},
 {feature:'Music, publishing and cloud sync',values:['Available services only','Available services only','Available services only'],upcoming:true},
] as const;
