#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FaceLivenessModule, NSObject)
RCT_EXTERN_METHOD(startFaceLivenessDetection:(NSString *)sessionId
                  region:(NSString *)region
                  credentials:(NSDictionary *)credentials
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
