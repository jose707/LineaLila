import Amplify
import FaceLiveness
import React
import SwiftUI
import UIKit

private struct SessionCredentials: AWSTemporaryCredentials {
  let accessKeyId: String
  let secretAccessKey: String
  let sessionToken: String
  let expiration: Date
}

private struct SessionCredentialsProvider: AWSCredentialsProvider {
  let credentials: SessionCredentials

  func fetchAWSCredentials() async throws -> AWSCredentials {
    credentials
  }
}

private struct LivenessCaptureView: View {
  let sessionId: String
  let region: String
  let credentials: SessionCredentials
  let onCompletion: (Result<Void, FaceLivenessDetectionError>) -> Void
  @State private var isPresented = true

  var body: some View {
    FaceLivenessDetectorView(
      sessionID: sessionId,
      credentialsProvider: SessionCredentialsProvider(credentials: credentials),
      region: region,
      isPresented: $isPresented,
      onCompletion: onCompletion
    )
  }
}

@objc(FaceLivenessModule)
final class FaceLivenessModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc(startFaceLivenessDetection:region:credentials:resolver:rejecter:)
  func startFaceLivenessDetection(
    _ sessionId: String,
    region: String,
    credentials: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let accessKeyId = credentials["accessKeyId"] as? String,
      let secretAccessKey = credentials["secretAccessKey"] as? String,
      let sessionToken = credentials["sessionToken"] as? String,
      let expirationValue = credentials["expiration"] as? String,
      !sessionId.isEmpty,
      !region.isEmpty
    else {
      reject("E_LIVENESS_CONFIG", "Faltan datos temporales para iniciar la prueba de vida.", nil)
      return
    }

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let expiration = formatter.date(from: expirationValue) ?? ISO8601DateFormatter().date(from: expirationValue), expiration > Date() else {
      reject("E_LIVENESS_CONFIG", "Las credenciales temporales no son válidas.", nil)
      return
    }
    let temporaryCredentials = SessionCredentials(
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      sessionToken: sessionToken,
      expiration: expiration
    )

    DispatchQueue.main.async {
      guard let presenter = Self.topPresenter() else {
        reject("E_LIVENESS_VIEW", "No se pudo abrir la cámara.", nil)
        return
      }
      var host: UIHostingController<LivenessCaptureView>!
      host = UIHostingController(rootView: LivenessCaptureView(
        sessionId: sessionId,
        region: region,
        credentials: temporaryCredentials,
        onCompletion: { result in
          DispatchQueue.main.async {
            host.dismiss(animated: true) {
              switch result {
              case .success:
                resolve(true)
              case .failure(let error):
                reject("E_LIVENESS_FAILED", error.message, error as NSError)
              }
            }
          }
        }
      ))
      host.modalPresentationStyle = .fullScreen
      presenter.present(host, animated: true)
    }
  }

  private static func topPresenter() -> UIViewController? {
    guard let windowScene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first,
          let root = windowScene.windows.first(where: \.isKeyWindow)?.rootViewController else { return nil }
    var current = root
    while let presented = current.presentedViewController { current = presented }
    return current
  }
}
