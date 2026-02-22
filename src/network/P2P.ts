/**
 * P2P - libp2p Peer-to-Peer Networking
 * 
 * Handles:
 * - Gossipsub message broadcasting
 * - Peer discovery and status exchange
 * - Mating proposals and acceptance
 * - Bot status broadcast
 */

import { createLibp2p, Libp2pOptions } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { mplex } from '@libp2p/mplex';
import { gossipsub } from '@libp2p/gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { PeerId } from '@libp2p/interface-peer-id';
import { MatingProposal, PeerMetadata } from '../types/index.js';

const AXO_TOPIC = 'axo-bots';
const MATING_TOPIC = 'axo-mating';
const DEFAULT_BOOTSTRAP_LIST = [
  '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p-websocket-star/',
];

export interface P2PConfig {
  listenPort?: number;
  bootstrapList?: string[];
  geneHash: string;
  metadata: PeerMetadata;
}

export interface P2PMessage {
  type: 'status' | 'mating_proposal' | 'mating_response' | 'distress';
  from: string;
  timestamp: number;
  payload: any;
  signature: string;
}

export class P2PNetwork {
  private node: any; // Libp2p node
  private config: P2PConfig;
  private proposalHandlers: Array<(proposal: MatingProposal) => Promise<boolean>> = [];
  private peerHandlers: Array<(peer: PeerMetadata) => void> = [];
  private knownPeers: Map<string, PeerMetadata> = new Map();
  private proposals: Map<string, MatingProposal> = new Map();

  constructor(config: P2PConfig) {
    this.config = config;
  }

  /**
   * Initialize libp2p node
   */
  async initialize(): Promise<void> {


    const options: Libp2pOptions = {
      transports: [tcp(), webSockets()],
      streamMuxers: [mplex()],
      pubsub: gossipsub({
        emitSelf: false,
        gossipIncoming: true,
        fallbackToFloodsub: true,
      }),
      peerDiscovery: [
        bootstrap({
          list: this.config.bootstrapList || DEFAULT_BOOTSTRAP_LIST,
        }),
      ],
      addresses: {
        listen: [`/ip4/0.0.0.0/tcp/${this.config.listenPort || 4001}`],
      },
    };

    this.node = await createLibp2p(options);

    // Subscribe to topics
    await this.node.pubsub.subscribe(AXO_TOPIC);
    await this.node.pubsub.subscribe(MATING_TOPIC);

    // Handle incoming messages
    this.node.pubsub.addEventListener('message', (event: any) => {
      this.handleMessage(event.detail);
    });

    // Handle peer discovery
    this.node.addEventListener('peer:discovery', (event: any) => {
  
    });

    // Handle peer connection
    this.node.connectionManager.addEventListener('peer:connect', (event: any) => {
  
    });


  }

  /**
   * Start the P2P node
   */
  async start(): Promise<void> {
    await this.node.start();


    // Broadcast initial status
    await this.broadcastStatus();
  }

  /**
   * Stop the P2P node
   */
  async stop(): Promise<void> {
    await this.node.stop();

  }

  /**
   * Broadcast current status to network
   */
  async broadcastStatus(): Promise<void> {
    const message: P2PMessage = {
      type: 'status',
      from: this.config.geneHash,
      timestamp: Date.now(),
      payload: this.config.metadata,
      signature: await this.signMessage(this.config.geneHash),
    };

    await this.publish(AXO_TOPIC, message);
  }

  /**
   * Broadcast distress signal (low funds, etc.)
   */
  async broadcastDistress(reason: string): Promise<void> {
    const message: P2PMessage = {
      type: 'distress',
      from: this.config.geneHash,
      timestamp: Date.now(),
      payload: { reason, balance: this.config.metadata.balance.toString() },
      signature: await this.signMessage(this.config.geneHash),
    };

    await this.publish(AXO_TOPIC, message);

  }

  /**
   * Propose mating to a target peer
   */
  async proposeMate(targetGeneHash: string): Promise<MatingProposal> {
    if (targetGeneHash === this.config.geneHash) {
      throw new Error('Cannot mate with self');
    }

    const proposal: MatingProposal = {
      proposerGeneHash: this.config.geneHash,
      targetGeneHash,
      proposerPeerId: this.node.peerId.toString(),
      timestamp: Date.now(),
      status: 'pending',
      signature: await this.signMessage(`${this.config.geneHash}:${targetGeneHash}`),
    };

    const message: P2PMessage = {
      type: 'mating_proposal',
      from: this.config.geneHash,
      timestamp: Date.now(),
      payload: proposal,
      signature: proposal.signature,
    };

    await this.publish(MATING_TOPIC, message);
    this.proposals.set(proposal.proposerGeneHash, proposal);



    return proposal;
  }

  /**
   * Accept a mating proposal
   */
  async acceptMateProposal(proposal: MatingProposal): Promise<void> {
    // Verify proposal
    if (proposal.targetGeneHash !== this.config.geneHash) {
      throw new Error('Proposal not for this bot');
    }

    // Check if we're ready
    if (!this.config.metadata.willingToMate) {
      throw new Error('Not ready for mating');
    }

    const response: P2PMessage = {
      type: 'mating_response',
      from: this.config.geneHash,
      timestamp: Date.now(),
      payload: {
        originalProposal: proposal,
        accepted: true,
        accepterPeerId: this.node.peerId.toString(),
      },
      signature: await this.signMessage(`${proposal.proposerGeneHash}:accepted`),
    };

    await this.publish(MATING_TOPIC, response);

    // Update proposal status
    proposal.status = 'accepted';
    this.proposals.set(proposal.proposerGeneHash, proposal);


  }

  /**
   * Reject a mating proposal
   */
  async rejectMateProposal(proposal: MatingProposal, reason: string): Promise<void> {
    const response: P2PMessage = {
      type: 'mating_response',
      from: this.config.geneHash,
      timestamp: Date.now(),
      payload: {
        originalProposal: proposal,
        accepted: false,
        reason,
      },
      signature: await this.signMessage(`${proposal.proposerGeneHash}:rejected`),
    };

    await this.publish(MATING_TOPIC, response);

    proposal.status = 'rejected';
    this.proposals.set(proposal.proposerGeneHash, proposal);
  }

  /**
   * Register handler for incoming mating proposals
   */
  onMatingProposal(handler: (proposal: MatingProposal) => Promise<boolean>): void {
    this.proposalHandlers.push(handler);
  }

  /**
   * Register handler for peer discovery
   */
  onPeerDiscovery(handler: (peer: PeerMetadata) => void): void {
    this.peerHandlers.push(handler);
  }

  /**
   * Get known peers
   */
  getKnownPeers(): PeerMetadata[] {
    return Array.from(this.knownPeers.values());
  }

  /**
   * Get pending proposals
   */
  getPendingProposals(): MatingProposal[] {
    return Array.from(this.proposals.values()).filter((p) => p.status === 'pending');
  }

  /**
   * Get connected peer count
   */
  getConnectedPeerCount(): number {
    return this.node?.connectionManager?.getConnections()?.length || 0;
  }

  /**
   * Publish message to topic
   */
  private async publish(topic: string, message: P2PMessage): Promise<void> {
    const data = Buffer.from(JSON.stringify(message));
    await this.node.pubsub.publish(topic, data);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(event: any): Promise<void> {
    try {
      const message: P2PMessage = JSON.parse(Buffer.from(event.data).toString('utf8'));

      // Verify signature (simplified - real implementation would verify properly)
      if (!message.signature) {
        console.warn('[P2P] Message without signature received');
        return;
      }

      switch (message.type) {
        case 'status':
          this.handleStatusMessage(message);
          break;
        case 'mating_proposal':
          await this.handleMatingProposal(message);
          break;
        case 'mating_response':
          this.handleMatingResponse(message);
          break;
        case 'distress':
          this.handleDistressMessage(message);
          break;
      }
    } catch (error) {
      console.error('[P2P] Error handling message:', error);
    }
  }

  /**
   * Handle status broadcast
   */
  private handleStatusMessage(message: P2PMessage): void {
    const metadata: PeerMetadata = message.payload;
    this.knownPeers.set(message.from, metadata);

    // Notify handlers
    for (const handler of this.peerHandlers) {
      handler(metadata);
    }
  }

  /**
   * Handle mating proposal
   */
  private async handleMatingProposal(message: P2PMessage): Promise<void> {
    const proposal: MatingProposal = message.payload;

    // Only handle if we're the target
    if (proposal.targetGeneHash !== this.config.geneHash) {
      return;
    }



    // Store proposal
    this.proposals.set(proposal.proposerGeneHash, proposal);

    // Notify handlers
    for (const handler of this.proposalHandlers) {
      try {
        const accepted = await handler(proposal);
        if (accepted) {
          await this.acceptMateProposal(proposal);
        } else {
          await this.rejectMateProposal(proposal, 'Not ready');
        }
      } catch (error) {
        console.error('[P2P] Error handling proposal:', error);
      }
    }
  }

  /**
   * Handle mating response
   */
  private handleMatingResponse(message: P2PMessage): void {
    const { originalProposal, accepted, reason } = message.payload;

    // Only handle if we're the original proposer
    if (originalProposal.proposerGeneHash !== this.config.geneHash) {
      return;
    }

    const proposal = this.proposals.get(originalProposal.targetGeneHash);
    if (proposal) {
      proposal.status = accepted ? 'accepted' : 'rejected';

    }
  }

  /**
   * Handle distress signal
   */
  private handleDistressMessage(message: P2PMessage): void {

    // Could implement rescue logic here
  }

  /**
   * Sign a message (simplified - real implementation would use proper crypto)
   */
  private async signMessage(content: string): Promise<string> {
    // In production, this would sign with the bot's wallet
    return `sig-${Buffer.from(content).toString('base64').slice(0, 20)}`;
  }

  /**
   * Update local metadata
   */
  updateMetadata(metadata: Partial<PeerMetadata>): void {
    this.config.metadata = { ...this.config.metadata, ...metadata };
  }
}

export default P2PNetwork;
